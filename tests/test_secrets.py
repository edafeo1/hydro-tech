"""Verify the safety guard detects credentials without relying on real secrets."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("secret_check", Path(__file__).parents[1] / "scripts/check-secrets.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CredentialGuardTests(unittest.TestCase):
    def test_generated_fixtures_are_detected(self):
        fixtures = [
            (b"AK" + b"IA" + b"A" * 16, "AWS access key ID"),
            (b"ghp" + b"_" + b"a" * 36, "GitHub access token"),
            (b"-----BEGIN " + b"PRIVATE KEY-----", "private key"),
            (b"xoxb" + b"-" + b"1" * 24, "Slack token"),
        ]
        for data, kind in fixtures:
            with self.subTest(kind=kind):
                self.assertIn(kind, module.findings(data))

    def test_public_identifiers_and_code_patterns_are_allowed(self):
        self.assertFalse(module.findings(b"arn:aws:iam::123456789012:role/example"))
        self.assertFalse(module.findings(b"google-site-verification=public-verification-token"))
        self.assertFalse(module.findings(b"ENQUIRY_ENDPOINT=https://example.execute-api.ap-southeast-2.amazonaws.com/enquiries"))


if __name__ == "__main__":
    unittest.main()
