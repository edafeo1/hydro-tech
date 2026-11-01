# Current operations and launch status

The latest release is deployed to the existing AWS preview. The original business
website has not been cut over. Historical AWS setup/verification snapshots remain
records of their initial checks; this page describes the current implementation.

## Verified

- The hosting and enquiry stacks both reached `UPDATE_COMPLETE`. No existing
  enquiry table or public API endpoint was replaced. The enquiry stack has 25
  resources, including the encrypted FIFO delivery/failed queues and worker.
- The worker mapping is enabled with batch size one and partial failure handling.
  Three failure alarms are active and the operator's email subscription is confirmed.
- A real browser submission reached the receiving test mailbox's Inbox. Its
  targeted private status record confirmed `SENT`. A repeated API submission
  returned the same reference without creating another delivery.
- A labelled CloudWatch alarm test reached the operator inbox. The alarm was
  restored to `OK` after testing. Alert messages contain no customer form contents.
- All 23 generated documents passed structural/link/security checks. All normal
  public page routes returned HTTP 200 with the security headers; an unknown route
  returned the proper HTTP 404. The direct `/404.html` template is itself an
  accessible file with noindex protection.
- Desktop browser checks covered navigation, modern images, the gallery filter,
  photo viewer, Escape/focus restoration and the live contact form. Our Approach
  still contains no main photographs, preserving its distinction from Our Work.
- Production and staging builds, infrastructure schema validation and the delivery
  boundary tests passed GitHub CI. Every release commit's author and committer
  were verified as the repository owner, without an added coauthor.

## Cost watch

`HydroTec-Cost-Watch` is a monitoring-only monthly AWS account budget. Its US$5
reference amount sends actual-usage alerts above US$1 and US$5, excluding credits
and refunds. It covers the whole account, including any other projects. This does
not approve that amount of spending, stop resources, change the account plan, or
provide an immediate hard cap. AWS billing updates and notifications can lag.

No EC2 server, NAT gateway, database server, dedicated email IP, provisioned
capacity or paid customer-managed KMS key was added. Existing free-account credits
and usage-based services are retained. Alarms, custom metrics, queue polling,
requests, email and storage can still incur usage charges. Do not activate a paid
account upgrade or new subscription just to complete this setup.

## Remaining production dependencies

- Access to the current DNS provider. Complete ACM/SES verification, preserve
  existing mail records, map old URLs, then coordinate root/www web records,
  canonical domain, API origin and indexing flags as one launch.
- A brand-authenticated SES sender and the intended business recipient. The
  temporary verified test route remains in place. A successful Inbox test today
  does not guarantee future Inbox placement, and does not replace domain DKIM/DMARC.
- Owner-controlled Google account, any existing property/profile/account IDs,
  accurate business hours and private business verification details. The Google
  launch plan and three ad-group drafts are prepared; no accounts, Maps profile,
  campaign spend or tracking tags were created by this release.
- An explicit advertising budget and verified conversion measurement before paid
  delivery. All drafts remain paused with no budget. No AdSense is installed.
- Owner configuration of GitHub main-branch protection/required CI and account
  recovery/MFA. The connected repository app does not have administration writes.
- A configured server-validated bot challenge if required for launch. Current
  validation, rate controls, honeypot and timing checks are not a CAPTCHA.
- Physical-device QA and production-domain performance measurements. No
  Lighthouse score, field Core Web Vitals result or search ranking is claimed.

The Google draft, owner launch checklist and website preview are repository
artifacts. Private mailbox records, message IDs, enquiry references and customer
content are intentionally absent from this operational record.


## Clarity and final QA follow-up

The homepage now names waterproofing/building repairs directly, describes the
actual problems and audience in plain language, and offers a short suitability
check. Service cards use friendly display titles while retaining their original
service values. The full company/service data, eight gallery photographs, 11 FAQs
and process information were checked against the previous source and preserved.

All 23 pages were checked at 320, 375, 768 and 1280 CSS pixels, with no horizontal
page overflow after fixing the Broadway project heading. Mobile navigation,
keyboard wrapping/Escape and contact validation were checked in the browser.
This is responsive-layout verification, not a physical-device or field-vitals
measurement. Primary-button text contrast was improved and the unopened gallery
no longer downloads a placeholder photograph on every page.

The form uses elapsed timing to tolerate a visitor's clock differing from AWS and
verifies the exact returned submission reference. The worker retains all failed
and unprocessed FIFO records. The suite has 23 tests, and CI checks recognisable
credential patterns across reachable Git history without printing their values.

The development-only responsive viewer is removed by a normal build and blocked
by release checks. The step-by-step code guide is `code-walkthrough.md`.
Owner-only branch protection/MFA remain unapplied; a disabled ruleset import is
prepared. Google, DNS, business verification, advertising and existing routing
of test enquiries are outside this follow-up.

The clarity release is deployed to the AWS preview from the tested
`clarity-and-qa-20261102` review branch. Pull request #1 remains open and `main`
has not been advanced. The public homepage screenshot has been refreshed.

After deployment, a visitor journey from a balcony problem to its service and
preselected enquiry form completed successfully. The labelled enquiry reached
the test mailbox's Inbox and its targeted delivery status was `SENT`. Repeating
the same submission with a simulated device clock seven days ahead returned the
same reference without another email. CloudFront invalidation completed and all
three enquiry failure alarms reported `OK`. No new AWS resources or services
were added by this follow-up. Domain-authenticated email remains a launch
dependency; this Inbox result is a test observation, not a delivery guarantee.
