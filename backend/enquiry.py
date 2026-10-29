"""Hydro-Tec's public enquiry endpoint. No customer content is written to logs."""

import base64
import hashlib
import json
import logging
import os
import re
import time
import uuid
from datetime import datetime, timezone

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError


CONFIG = Config(connect_timeout=2, read_timeout=4, retries={"total_max_attempts": 2, "mode": "standard"})
table = boto3.resource("dynamodb", config=CONFIG).Table(os.environ["ENQUIRY_TABLE"])
ses = boto3.client("sesv2", config=CONFIG)
ORIGIN = os.environ["ALLOWED_ORIGIN"]
EMAIL = os.environ["BUSINESS_EMAIL"]
DAILY_LIMIT = int(os.environ.get("DAILY_LIMIT", "100"))
logger = logging.getLogger()
logger.setLevel(logging.INFO)
EMAIL_RE = re.compile(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}")
SERVICES = {"", "Leaking balconies", "Remedial waterproofing", "Facade coatings", "Rope access", "Screeding to falls", "Body corporate remediation", "Warranty and quality information", "Something else"}
ROLES = {"", "Body corporate committee member", "Strata or building manager", "Builder or remedial contractor", "Other"}
TIMINGS = {"", "Actively leaking", "Next 1–3 months", "Planning a future project"}
REPORTS = {"", "Yes, available to share", "No, assessment needed"}


def response(status, message, **extra):
    return {"statusCode": status, "headers": {"Content-Type": "application/json", "Cache-Control": "no-store"}, "body": json.dumps({"message": message, **extra})}


def log_event(event, reference, code=""):
    logger.info(json.dumps({"event": event, "reference": reference, "code": code}))


def validate(data):
    if not isinstance(data, dict):
        raise ValueError("Check the enquiry details and try again.")
    fields = {"name": 120, "contact": 180, "suburb": 120, "problem": 2000, "service": 80, "role": 80, "timing": 80, "report": 80}
    details = {}
    for key, limit in fields.items():
        value = data.get(key, "")
        if not isinstance(value, str) or len(value) > limit:
            raise ValueError("Check the enquiry details and try again.")
        value = value.strip()
        # Newlines belong only in the plain-text problem description.
        if any(ord(c) < 32 and not (key == "problem" and c in "\n\r\t") for c in value) or "\x7f" in value:
            raise ValueError("Check the enquiry details and try again.")
        details[key] = value
    if not all(details[key] for key in ("name", "contact", "suburb", "problem")):
        raise ValueError("Add your name, phone or email, suburb and a description of the problem.")
    contact = details["contact"]
    phone = bool(re.fullmatch(r"[+()\d .-]{6,25}", contact)) and len(re.findall(r"\d", contact)) >= 6
    if not EMAIL_RE.fullmatch(contact) and not phone:
        raise ValueError("Enter a phone number or email address so Noxy can reply.")
    for key, choices in (("service", SERVICES), ("role", ROLES), ("timing", TIMINGS), ("report", REPORTS)):
        if details[key] not in choices:
            raise ValueError("Choose one of the available project options.")
    submission_id = data.get("submissionId", "")
    if not isinstance(submission_id, str):
        raise ValueError("Refresh this page and try again.")
    try:
        parsed = uuid.UUID(submission_id, version=4)
    except (ValueError, AttributeError):
        raise ValueError("Refresh this page and try again.") from None
    if str(parsed) != submission_id:
        raise ValueError("Refresh this page and try again.")
    return details, submission_id


def consume_limit(key, limit, expires):
    table.update_item(
        Key={"pk": key},
        UpdateExpression="SET expiresAt = :expiry ADD #count :one",
        ConditionExpression="attribute_not_exists(#count) OR #count < :limit",
        ExpressionAttributeNames={"#count": "count"},
        ExpressionAttributeValues={":expiry": expires, ":one": 1, ":limit": limit},
    )


def email_content(details, reference):
    lines = ["New Hydro-Tec website enquiry", "", f"Reference: {reference}", f"Name: {details['name']}", f"Preferred contact: {details['contact']}", f"Building suburb: {details['suburb']}"]
    for key, label in (("service", "Service"), ("role", "Role"), ("timing", "Timing"), ("report", "Existing report")):
        if details[key]:
            lines.append(f"{label}: {details[key]}")
    lines.extend(["", "What's happening:", details["problem"], "", "Submitted through the Hydro-Tec website."])
    request = {
        "FromEmailAddress": f"Hydro-Tec website <{EMAIL}>",
        "Destination": {"ToAddresses": [EMAIL]},
        "Content": {"Simple": {
            "Subject": {"Data": f"Website enquiry | {details['suburb']} | {reference}", "Charset": "UTF-8"},
            "Body": {"Text": {"Data": "\n".join(lines), "Charset": "UTF-8"}},
        }},
    }
    if EMAIL_RE.fullmatch(details["contact"]):
        request["ReplyToAddresses"] = [details["contact"]]
    return request


def handler(event, context):
    headers = {str(k).lower(): str(v) for k, v in (event.get("headers") or {}).items()}
    if headers.get("origin") != ORIGIN:
        return response(403, "Submit your enquiry through the Hydro-Tec website.")
    method = event.get("requestContext", {}).get("http", {}).get("method")
    if method != "POST":
        return response(405, "Use the enquiry form to send a message.")
    if headers.get("content-type", "").split(";")[0].strip().lower() != "application/json":
        return response(415, "Use the enquiry form to send a message.")
    raw = event.get("body") or ""
    if not isinstance(raw, str) or len(raw) > 24000:
        return response(413, "Please shorten the description and try again.")
    try:
        if event.get("isBase64Encoded"):
            raw = base64.b64decode(raw, validate=True).decode("utf-8")
        if len(raw.encode("utf-8")) > 16000:
            return response(413, "Please shorten the description and try again.")
        data = json.loads(raw)
        details, submission_id = validate(data)
        # A filled hidden field is rejected without creating a lead or sending email.
        if data.get("website"):
            return response(400, "Please refresh the page and try again, or call Noxy.")
        started = data.get("startedAt")
        if not isinstance(started, (int, float)) or isinstance(started, bool) or not (2 <= time.time() - started / 1000 <= 86400):
            return response(400, "Please take a moment to check the details, then try again.")
    except (ValueError, TypeError, UnicodeDecodeError) as error:
        message = str(error) if isinstance(error, ValueError) and not isinstance(error, json.JSONDecodeError) else "Check the enquiry details and try again."
        # Encoding and JSON errors must not echo customer input.
        if not message.startswith(("Check ", "Add ", "Enter ", "Choose ", "Refresh ")):
            message = "Check the enquiry details and try again."
        return response(400, message)

    now = int(time.time())
    key = {"pk": f"ENQUIRY#{submission_id}"}
    reference = f"HT-{submission_id}"
    digest = hashlib.sha256(json.dumps(details, sort_keys=True).encode()).hexdigest()
    try:
        existing = table.get_item(Key=key, ConsistentRead=True).get("Item")
        if existing:
            if existing.get("digest") != digest:
                return response(409, "The details changed. Please refresh the page before sending a new enquiry.")
            if existing.get("status") == "SENT":
                return response(200, "Your enquiry has been submitted.", reference=reference)
            if int(existing.get("lockedUntil", 0)) > now:
                return response(409, "This enquiry is being sent. Please wait a moment before trying again.")

        ip = event.get("requestContext", {}).get("http", {}).get("sourceIp", "unknown")
        day = datetime.fromtimestamp(now, timezone.utc).strftime("%Y-%m-%d")
        ip_key = hashlib.sha256(f"{day}:{ip}".encode()).hexdigest()
        try:
            consume_limit(f"RATE#{ip_key}#{now // 3600}", 5, now + 172800)
            consume_limit(f"DAILY#{day}", DAILY_LIMIT, now + 172800)
        except table.meta.client.exceptions.ConditionalCheckFailedException:
            return response(429, "The form has reached its sending limit. Please call or email Noxy directly.")

        try:
            if existing:
                table.update_item(Key=key,
                    UpdateExpression="SET #status = :sending, lockedUntil = :lock, expiresAt = :expiry",
                    ConditionExpression="#status <> :sent AND lockedUntil <= :now",
                    ExpressionAttributeNames={"#status": "status"},
                    ExpressionAttributeValues={":sending": "SENDING", ":sent": "SENT", ":lock": now + 45, ":now": now, ":expiry": now + 2592000})
            else:
                table.put_item(Item={**key, "reference": reference, "digest": digest, "details": details, "createdAt": now, "expiresAt": now + 2592000, "status": "SENDING", "lockedUntil": now + 45}, ConditionExpression="attribute_not_exists(pk)")
        except table.meta.client.exceptions.ConditionalCheckFailedException:
            return response(409, "This enquiry is being sent. Please wait a moment before trying again.")

        sent = ses.send_email(**email_content(details, reference))
    except (ClientError, BotoCoreError) as error:
        code = error.response.get("Error", {}).get("Code", "AWS_ERROR") if isinstance(error, ClientError) else "CONNECTION_ERROR"
        log_event("enquiry_send_failed", reference, code)
        # Keep the private backup. The visitor can retry the same ID after the lock expires.
        return response(503, "We could not confirm your enquiry was sent. Please wait a minute and retry, or call or email Noxy directly.")

    try:
        table.update_item(Key=key, UpdateExpression="SET #status = :sent, messageId = :message, sentAt = :now REMOVE lockedUntil",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={":sent": "SENT", ":message": sent["MessageId"], ":now": now})
    except (ClientError, BotoCoreError):
        # SES accepted this email. Do not tell the visitor to resend just because metadata failed.
        log_event("enquiry_delivery_metadata_failed", reference)
    log_event("enquiry_sent", reference)
    return response(200, "Your enquiry has been submitted.", reference=reference)
