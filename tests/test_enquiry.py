"""Boundary and delivery tests. Cloud integration is verified separately on AWS."""

import copy
import importlib.util
import json
import os
from pathlib import Path
import sys
import time
import types
import unittest
from unittest.mock import Mock, patch


class AwsError(Exception):
    def __init__(self, code="ServiceUnavailable", operation="Test"):
        self.response = {"Error": {"Code": code}}
        super().__init__(code)


class ConditionalError(AwsError):
    pass


class Table:
    def __init__(self):
        self.items = {}
        self.meta = types.SimpleNamespace(client=types.SimpleNamespace(exceptions=types.SimpleNamespace(ConditionalCheckFailedException=ConditionalError)))

    def get_item(self, Key, **kwargs):
        return {"Item": copy.deepcopy(self.items[Key["pk"]])} if Key["pk"] in self.items else {}

    def put_item(self, Item, **kwargs):
        if Item["pk"] in self.items:
            raise ConditionalError()
        self.items[Item["pk"]] = copy.deepcopy(Item)

    def update_item(self, Key, ExpressionAttributeValues, UpdateExpression, **kwargs):
        key, values = Key["pk"], ExpressionAttributeValues
        if key.startswith(("RATE#", "DAILY#")):
            item = self.items.setdefault(key, {"pk": key, "count": 0})
            if item["count"] >= values[":limit"]:
                raise ConditionalError()
            item["count"] += 1
            item["expiresAt"] = values[":expiry"]
        elif ":sending" in values:
            item = self.items[key]
            if item["status"] == "SENT" or item["lockedUntil"] > values[":now"]:
                raise ConditionalError()
            item.update(status="SENDING", lockedUntil=values[":lock"], expiresAt=values[":expiry"])
        else:
            self.items[key].update(status="SENT", messageId=values[":message"], sentAt=values[":now"])
            self.items[key].pop("lockedUntil", None)


class EnquiryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Keep unit tests independent of locally installed AWS SDK versions.
        modules = {"boto3": Mock(), "botocore": types.ModuleType("botocore"), "botocore.config": types.SimpleNamespace(Config=Mock()), "botocore.exceptions": types.SimpleNamespace(BotoCoreError=ConnectionError, ClientError=AwsError)}
        with patch.dict(sys.modules, modules), patch.dict(os.environ, {"ENQUIRY_TABLE": "test-enquiries", "BUSINESS_EMAIL": "noxy@hydrotecbuildingprotectiongroup.com.au", "ALLOWED_ORIGIN": "https://d3s90nqnvv0rq0.cloudfront.net", "DAILY_LIMIT": "100"}):
            spec = importlib.util.spec_from_file_location("enquiry", Path(__file__).parents[1] / "backend/enquiry.py")
            cls.module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(cls.module)

    def setUp(self):
        self.module.table = Table()
        self.module.ses = Mock()
        self.module.ses.send_email.return_value = {"MessageId": "accepted-message"}
        self.data = {"name": "Website integration test", "contact": "visitor@example.com", "suburb": "Brisbane", "problem": "Test enquiry; no customer work required.", "service": "", "role": "", "timing": "", "report": "", "website": "", "submissionId": "cc2ad3c3-e812-4198-919b-a11d8f838285", "startedAt": int((time.time() - 10) * 1000)}

    def event(self, data=None):
        return {"headers": {"origin": self.module.ORIGIN, "content-type": "application/json"}, "requestContext": {"http": {"method": "POST", "sourceIp": "192.0.2.1"}}, "body": json.dumps(self.data if data is None else data)}

    def send(self, event=None):
        return self.module.handler(self.event() if event is None else event, None)

    def test_fixed_business_destination_and_visitor_reply_to(self):
        self.data["to"] = "attacker@example.net"
        result = self.send()
        self.assertEqual(result["statusCode"], 200)
        call = self.module.ses.send_email.call_args.kwargs
        self.assertEqual(call["Destination"], {"ToAddresses": [self.module.EMAIL]})
        self.assertIn(self.module.EMAIL, call["FromEmailAddress"])
        self.assertEqual(call["ReplyToAddresses"], ["visitor@example.com"])
        record = self.module.table.items[f"ENQUIRY#{self.data['submissionId']}"]
        self.assertEqual(record["status"], "SENT")
        self.assertGreater(record["expiresAt"], time.time() + 29 * 86400)

    def test_phone_contact_does_not_become_email_header(self):
        self.data["contact"] = "0456 123 456"
        self.assertEqual(self.send()["statusCode"], 200)
        self.assertNotIn("ReplyToAddresses", self.module.ses.send_email.call_args.kwargs)

    def test_repeat_submission_does_not_send_twice(self):
        first, repeated = self.send(), self.send()
        self.assertEqual(json.loads(first["body"])["reference"], json.loads(repeated["body"])["reference"])
        self.assertEqual(repeated["statusCode"], 200)
        self.module.ses.send_email.assert_called_once()

    def test_reused_identifier_with_different_data_rejected(self):
        self.send()
        self.data["problem"] = "Different enquiry"
        self.assertEqual(self.send()["statusCode"], 409)
        self.module.ses.send_email.assert_called_once()

    def test_origin_method_and_content_type_checked_before_storage(self):
        for mutate, expected in ((lambda e: e["headers"].update(origin="https://other.example"), 403), (lambda e: e["requestContext"]["http"].update(method="GET"), 405), (lambda e: e["headers"].update({"content-type": "text/plain"}), 415)):
            with self.subTest(expected=expected):
                event = self.event()
                mutate(event)
                self.assertEqual(self.send(event)["statusCode"], expected)
        self.assertFalse(self.module.table.items)
        self.module.ses.send_email.assert_not_called()

    def test_invalid_or_injected_input_never_sends(self):
        for changes in ({"name": ""}, {"contact": "not a phone or email"}, {"contact": "visitor@example.com\r\nBcc: someone@example.com"}, {"name": "bad\nheader"}, {"service": "made up option"}, {"problem": "x" * 2001}, {"submissionId": "wrong"}, {"website": "spam.example"}, {"startedAt": int(time.time() * 1000)}):
            with self.subTest(changes=changes):
                self.assertEqual(self.send(self.event({**self.data, **changes}))["statusCode"], 400)
        self.assertFalse(self.module.table.items)
        self.module.ses.send_email.assert_not_called()

    def test_bad_json_and_oversized_body(self):
        event = self.event()
        event["body"] = '{"name":'
        self.assertEqual(self.send(event)["statusCode"], 400)
        event["body"] = "x" * 24001
        self.assertEqual(self.send(event)["statusCode"], 413)
        self.module.ses.send_email.assert_not_called()

    def test_ip_and_daily_limits_prevent_email(self):
        now = int(time.time())
        for key, limit in ((f"RATE#{self.module.hashlib.sha256(f'{self.module.datetime.fromtimestamp(now, self.module.timezone.utc).strftime('%Y-%m-%d')}:192.0.2.1'.encode()).hexdigest()}#{now // 3600}", 5), (f"DAILY#{self.module.datetime.fromtimestamp(now, self.module.timezone.utc).strftime('%Y-%m-%d')}", 100)):
            with self.subTest(key=key):
                self.module.table.items = {key: {"pk": key, "count": limit}}
                self.assertEqual(self.send()["statusCode"], 429)
        self.module.ses.send_email.assert_not_called()

    def test_ses_failure_retains_backup_and_allows_retry_after_lock(self):
        self.module.ses.send_email.side_effect = AwsError("MessageRejected")
        with self.assertLogs(level="INFO") as logs:
            self.assertEqual(self.send()["statusCode"], 503)
        self.assertNotIn(self.data["contact"], " ".join(logs.output))
        self.assertNotIn(self.data["problem"], " ".join(logs.output))
        self.assertEqual(self.send()["statusCode"], 409)
        self.module.ses.send_email.side_effect = None
        with patch.object(self.module.time, "time", return_value=time.time() + 46):
            self.assertEqual(self.send()["statusCode"], 200)


if __name__ == "__main__":
    unittest.main()
