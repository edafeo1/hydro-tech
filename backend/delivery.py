"""Deliver queued references. Customer details stay in the private Sydney table.

SES does not provide an idempotency key for SendEmail. An ambiguous send is held
for an operator instead of automatically sending a potentially duplicate email.
"""
import json
import logging
import os
import re
import time
import uuid

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

CONFIG = Config(connect_timeout=2, read_timeout=4, retries={"total_max_attempts": 1, "mode": "standard"})
table = boto3.resource("dynamodb", config=CONFIG).Table(os.environ["ENQUIRY_TABLE"])
ses = boto3.client("sesv2", config=CONFIG)
SENDER = os.environ["BUSINESS_EMAIL"]
RECIPIENT = os.environ.get("RECIPIENT_EMAIL") or SENDER
logger = logging.getLogger()
logger.setLevel(logging.INFO)
EMAIL_RE = re.compile(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}")


def log(event, reference, code=""):
    logger.info(json.dumps({"event": event, "reference": reference, "code": code}))


def email_content(details, reference):
    lines = ["New Hydro-Tec website enquiry", "", f"Reference: {reference}", f"Name: {details['name']}", f"Preferred contact: {details['contact']}", f"Building suburb: {details['suburb']}"]
    for key, label in (("service", "Service"), ("role", "Role"), ("timing", "Timing"), ("report", "Existing report")):
        if details.get(key):
            lines.append(f"{label}: {details[key]}")
    lines.extend(["", "What's happening:", details["problem"], "", "Submitted through the Hydro-Tec website."])
    request = {
        "FromEmailAddress": f"Hydro-Tec website <{SENDER}>",
        "Destination": {"ToAddresses": [RECIPIENT]},
        "Content": {"Simple": {
            "Subject": {"Data": f"Website enquiry | {details['suburb']} | {reference}", "Charset": "UTF-8"},
            "Body": {"Text": {"Data": "\n".join(lines), "Charset": "UTF-8"}},
        }},
    }
    if EMAIL_RE.fullmatch(details["contact"]):
        request["ReplyToAddresses"] = [details["contact"]]
    return request


def deliver(submission_id):
    if str(uuid.UUID(submission_id, version=4)) != submission_id:
        raise ValueError("Invalid queue reference")
    key = {"pk": f"ENQUIRY#{submission_id}"}
    reference = f"HT-{submission_id}"
    item = table.get_item(Key=key, ConsistentRead=True).get("Item")
    if not item or int(item.get("expiresAt", 0)) <= int(time.time()):
        log("enquiry_delivery_attention", reference, "MISSING_OR_EXPIRED")
        raise RuntimeError("Enquiry needs an operator check")
    if item.get("status") == "SENT":
        return
    if item.get("status") in {"DELIVERING", "UNCERTAIN"}:
        log("enquiry_delivery_attention", reference, "UNCERTAIN_SEND")
        raise RuntimeError("Ambiguous delivery needs an operator check")

    table.update_item(Key=key, UpdateExpression="SET #status = :delivering",
        ConditionExpression="#status IN (:pending, :queued)",
        ExpressionAttributeNames={"#status": "status"},
        ExpressionAttributeValues={":delivering": "DELIVERING", ":pending": "PENDING_QUEUE", ":queued": "QUEUED"})
    try:
        accepted = ses.send_email(**email_content(item["details"], reference))
    except ClientError as error:
        code = error.response.get("Error", {}).get("Code", "AWS_ERROR")
        if error.response.get("ResponseMetadata", {}).get("HTTPStatusCode", 400) >= 500:
            log("enquiry_delivery_attention", reference, "AMBIGUOUS_SERVER_ERROR")
            raise RuntimeError("Ambiguous delivery needs an operator check") from None
        table.update_item(Key=key, UpdateExpression="SET #status = :queued",
            ExpressionAttributeNames={"#status": "status"}, ExpressionAttributeValues={":queued": "QUEUED"})
        log("enquiry_delivery_retry", reference, code)
        raise RuntimeError("Email service rejected this attempt") from None
    except BotoCoreError:
        # The provider may have accepted a request whose response was lost.
        log("enquiry_delivery_attention", reference, "AMBIGUOUS_RESPONSE")
        raise RuntimeError("Ambiguous delivery needs an operator check") from None
    try:
        table.update_item(Key=key, UpdateExpression="SET #status = :sent, messageId = :message, sentAt = :now REMOVE lockedUntil",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={":sent": "SENT", ":message": accepted["MessageId"], ":now": int(time.time())})
    except (ClientError, BotoCoreError):
        log("enquiry_delivery_attention", reference, "ACCEPTED_METADATA_FAILED")
        raise RuntimeError("Accepted email needs an operator check") from None
    log("enquiry_sent", reference)
    # One FIFO message group serialises delivery. Respect the SES sandbox rate.
    time.sleep(1.05)


def handler(event, context):
    failures = []
    records = event.get("Records", [])
    for index, message in enumerate(records):
        try:
            body = json.loads(message["body"])
            deliver(body["submissionId"])
        except Exception:
            # Never log an exception containing form values or AWS request parameters.
            # FIFO requires every unprocessed message to remain in the queue,
            # even if a future configuration increases the current batch size.
            failures.extend({"itemIdentifier": pending["messageId"]} for pending in records[index:])
            break
    return {"batchItemFailures": failures}
