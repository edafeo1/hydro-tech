# Direct website enquiries

The owner requested direct submission to the existing business inbox:
**noxy@hydrotecbuildingprotectiongroup.com.au**. The previous form only prepared
an email in the visitor's email app.

## Deployed staging status

- Stack: `hydrotec-enquiries`, **CREATE_COMPLETE** in connected account `385427225795`.
- Endpoint: `https://7h65rrgqo8.execute-api.ap-southeast-2.amazonaws.com/enquiries`.
- Function: `hydrotec-enquiries-submit`.
- Private table: `hydrotec-enquiries-EnquiryTable-1S66UQ22U3SFG`.
- Website: [contact page](https://d3s90nqnvv0rq0.cloudfront.net/contact/).
- SES identity and domain DKIM are still **PENDING**. Sending is not operational
  until verification succeeds. The live test returned HTTP 503, recorded
  `MessageRejected` without customer content, and retained the labelled test
  backup. It did not display a false success.
- See [the domain validation records](domain-setup.md) and
  [the verification snapshot](aws-enquiries-verification.json).

## How it works

The AWS build sets `ENQUIRY_ENDPOINT` to the HTTP API endpoint. JavaScript validates
the form and posts JSON. Lambda validates it again, checks abuse limits, saves a
private backup in DynamoDB, and calls SES. A success message is shown only after
SES accepts the email. Names, contact details and message content are not logged.

Both sender and recipient are fixed to the business address in the Lambda
configuration and its IAM policy. A visitor's email is used only for Reply-To.
A phone contact appears in the message body. User input cannot change recipients.

Submissions use UUID references and server-side duplicate detection. Retrying an
accepted request does not normally send another email. SES is not transactional
with DynamoDB: a process failure after SES acceptance but before the status write
can cause a repeated email. References make those messages recognisable.

Failures leave the form details on the current page and offer a populated email-app
fallback. Drafts are not put into localStorage, cookies or third-party analytics.
The `hydrotec:enquiry-submitted` browser event is emitted only after success and
contains only the reference; it does not itself load or send anything to Google.

## Verification and delivery

- Region: `ap-southeast-2` (Sydney).
- SES was in its sandbox with no verified identities at the initial check.
- An SES verification email was requested for the business inbox on 30 October
  2026 (Australia/Brisbane). The mailbox owner must open that verification link.
- Using a fixed verified business sender and recipient allows this initial flow
  in the sandbox without verifying each visitor. Automatic replies to arbitrary
  visitor addresses are not enabled.
- Verify the business domain with SES Easy DKIM DNS records before the production
  launch, so email is authenticated for that domain. This does not replace its
  existing inbox or require changing its normal MX records.
- SES acceptance is not proof of inbox delivery. Check a labelled test enquiry
  in the actual mailbox, including Spam, before treating delivery as complete.
- SES forwards delivery feedback to the sending identity. There is no separate
  paid monitoring, CRM, admin dashboard, newsletter or visitor auto-reply.

## Retention and abuse controls

- Enquiry backups: scheduled expiry 30 days after creation or a retry; DynamoDB TTL
  deletion is asynchronous and may take extra days.
- Rate counters with hashed source addresses: scheduled expiry after two days.
- Application logs: seven-day retention, references and error codes only.
- Five valid attempts per source address per hour; 100 email attempts per UTC day.
- HTTP API throttle target: 0.5 requests/second, burst 2. AWS throttle targets are
  best effort, not a financial spending cap.
- Hidden-field and minimum-fill-time checks supplement server-side validation.
  Origin checks restrict normal browsers but are not authentication or a CAPTCHA.
- The account currently permits only 10 concurrent Lambda executions. Reserved
  concurrency is intentionally omitted because AWS requires 100 unreserved units
  before positive reservations can be allocated. No quota increase is requested.
- Backups are encrypted, have no public access route, and are retained if the
  infrastructure stack is deleted or replaced. TTL remains the retention mechanism.

## Build and deploy

`npm run build` generates `infrastructure/aws-enquiries.json` from
`scripts/build-enquiries.mjs` and `backend/enquiry.py`. Edit those sources rather
than editing the inline Python in the generated template.

The separate `hydrotec-enquiries` stack contains nine resources: the encrypted
DynamoDB table, seven-day log group, scoped Lambda role, Lambda function, HTTP API,
integration, POST route, throttled stage and API invoke permission. It does not
alter the existing hosting stack or the business domain's DNS.

No EC2, NAT gateway, load balancer, database server, dedicated email IP or fixed-fee
email upgrade is required. API requests, Lambda, DynamoDB, logs and SES are metered.
SES reported its existing Essentials plan; its current base rate is USD 0.16 per
1,000 emails before data and other service charges. Preserve the existing AWS
account Free plan and credits; do not upgrade the account for this integration.

For AWS site builds:

```sh
SITE_ORIGIN=https://d3s90nqnvv0rq0.cloudfront.net \
SITE_INDEXABLE=0 \
ENQUIRY_ENDPOINT=https://7h65rrgqo8.execute-api.ap-southeast-2.amazonaws.com/enquiries \
npm run build
npm run check
python -m unittest discover -s tests -p test_enquiry.py
```

Without `ENQUIRY_ENDPOINT`, builds intentionally retain the email-app fallback and
its matching privacy explanation. The manual AWS workflow now requires the
`AWS_ENQUIRY_ENDPOINT` repository/environment variable to avoid reverting a live
form accidentally. That workflow remains disabled pending the existing OIDC setup.

## Production domain and advertising

The existing business domain should be kept. Its DNS is not in this AWS account;
access to the current DNS provider is needed. Validate an ACM certificate in
`us-east-1`, add the required domain names to CloudFront, update the API's exact
allowed origin, and rebuild the site with the final origin and endpoint. Capture
current DNS first, preserve email MX/TXT records, map old URLs, then switch web
records after enquiry delivery is tested. Enable indexing at production launch.

Google Ads promotes Hydro-Tec to prospective customers. AdSense places other
advertisers' ads on Hydro-Tec's pages. Google Ads with successful-enquiry conversion
tracking is the proposed fit for this service business. No advertising tag,
AdSense code, account connection or campaign spending is enabled by this change.
If AdSense is intended, the owner needs a publisher account, site verification,
Google's approval and the real publisher ID before its script and ads.txt are added.

## References

- [SES sandbox restrictions](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)
- [SES identity verification](https://docs.aws.amazon.com/ses/latest/dg/verify-addresses-and-domains.html)
- [SES pricing](https://aws.amazon.com/ses/pricing/)
- [Google Ads and AdSense](https://support.google.com/adsense/answer/76231)
- [Google website conversions](https://support.google.com/google-ads/answer/12718882)
- [CloudFront custom domains](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/add-domain-existing-distribution.html)
