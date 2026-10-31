# Website enquiry delivery

The contact page posts to a Sydney HTTP API. The submission function validates
fields, checks rate limits, stores a private 30-day backup, and places **only the
random enquiry ID** into an encrypted FIFO SQS queue. HTTP 202 means the enquiry
is saved and queued; it does not mean the email reached an inbox.

A separate worker loads that reference from the private table and sends a plain
text SES email to the fixed recipient. The API role cannot send email, and the
worker cannot create enquiries or send to a visitor-selected address. A visitor's
email appears only in Reply-To. Sender and recipient can be configured separately
with `BusinessEmail` and optional `RecipientEmail` stack parameters. While SES is
sandboxed, verify both addresses or their domains. Keep the existing verified
staging route until the business domain has authenticated sending configured.

## Failure and duplicate handling

- Repeated HTTP submissions use the same UUID and details digest. A queued or
  completed enquiry is acknowledged without creating a new queue message.
- FIFO deduplication provides a second five-minute queue-level guard. The worker
  also checks the table before sending, including after queue redelivery.
- Definite SES rejection retries through SQS, up to five receives. The source
  queue retains references up to four days; the failed queue retains them up to
  14 days. It contains references, not the enquiry contents.
- SES has no SendEmail idempotency key. Network timeouts, server errors and a
  failed status write after acceptance are ambiguous. The worker holds these
  for an operator check instead of blindly resending. A process killed during
  delivery receives the same treatment. This is not a claim of exactly-once mail.
- Existing records from the previous synchronous sender with status `SENDING`
  require an operator check rather than automatic replay.
- A queue failure returns an error and leaves the private backup. The visitor can
  retry the same ID after the short lock expires. A status-write race cannot
  overwrite an already completed delivery.
- Failed submissions keep the visitor's inputs on the current page and provide
  an email-app fallback. Drafts are not saved in browser storage.

## Alerts and recovery

Three CloudWatch alarms cover API server errors, references exhausted into the
failed queue, and application events requiring attention. The reference-only log
filters share one custom metric. An optional `AlertEmail` parameter adds an SNS
email subscription; its owner must confirm the AWS subscription before delivery
is active. Missing data is not treated as a failure on this low-traffic site.

SNS alerts contain operational metadata, never form contents. The optional topic
uses TLS-only API access and a publisher policy restricted to this stack's
CloudWatch alarms. It intentionally does not create a customer-managed KMS key
or enable SNS encryption requiring that key; this keeps the recurring cost down.
DynamoDB backups and both SQS queues are encrypted. Alarms, metrics, polling and
requests can still incur AWS usage charges; no service quota or alert is a hard
financial cap.

For a failed/ambiguous delivery, inspect the reference and error code in the
seven-day logs. Read only the corresponding table record with authorised AWS
access; do not scan all leads or copy their details into tickets or this repo.
Check SES feedback and the receiving mailbox, including Spam, before retrying.
If the email already arrived, reconcile its metadata and remove the matching
failed-queue reference without sending again. If delivery is conclusively absent,
record the investigation, reset only that record to `QUEUED` and redrive only its
message. Do not bulk-redrive ambiguous mail. Keep customer information private.

## Retention and controls

Backups are scheduled for DynamoDB TTL deletion after 30 days; actual deletion
is asynchronous. Hashed network rate counters expire after two days. Logs retain
references/error codes for seven days. Stateful tables and queues are retained if
the stack is deleted or replaced, so review their eventual deletion separately.

Server-side checks enforce lengths, required fields, valid options, UUIDs, content
type and allowed origin. Header fields reject control characters. The API targets
0.5 requests/second with burst two, five valid attempts per source IP/hour and 100
accepted attempts per UTC day. Network/browser checks, the honeypot and minimum
fill time deter simple abuse; they are **not authentication or a CAPTCHA**.
A real bot challenge still needs owner-controlled widget keys and server-side
validation before it can be claimed as active.

The account's low Lambda concurrency quota prevents positive reserved concurrency
allocations. No quota increase or provisioned capacity is required. One FIFO
message group serialises email and the worker leaves a short interval between
sends for SES sandbox limits. No EC2, NAT gateway, database server, dedicated IP,
paid email plan upgrade or fixed-price KMS key is introduced.

## Source and verification

`npm run build` generates `infrastructure/aws-enquiries.json` from
`scripts/build-enquiries.mjs`, `backend/enquiry.py` and `backend/delivery.py`.
Edit those sources, not inline generated Python. CI checks both production and
staging builds, infrastructure schemas and the failure-boundary tests.

```sh
SITE_ORIGIN=https://d3s90nqnvv0rq0.cloudfront.net \
SITE_INDEXABLE=0 ENQUIRY_TEST_MODE=1 \
ENQUIRY_ENDPOINT=https://7h65rrgqo8.execute-api.ap-southeast-2.amazonaws.com/enquiries \
npm run build
npm run check
python -m unittest discover -s tests -p test_enquiry.py
```

The site emits `hydrotec:enquiry-submitted` only after the API confirms receipt and
returns a valid reference. That event loads no analytics or advertising scripts.
Without `ENQUIRY_ENDPOINT`, the build uses the documented email-app fallback.
Production Google setup is tracked in [google-launch-plan.md](google-launch-plan.md).
Domain and sending authentication are tracked in [domain-setup.md](domain-setup.md).
SES acceptance is not proof of delivery or Inbox placement; complete a labelled
end-to-end test after every sender/domain change.

References: [Lambda SQS sources](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html),
[SES ambiguous errors](https://docs.aws.amazon.com/ses/latest/dg/troubleshoot-error-messages.html),
[SES verification](https://docs.aws.amazon.com/ses/latest/dg/verify-addresses-and-domains.html).
