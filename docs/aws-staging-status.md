# AWS staging deployment

Deployment date: **30 October 2026 (Australia/Brisbane)**.

Staging website: **https://d3s90nqnvv0rq0.cloudfront.net**

| Item | Verified value |
|---|---|
| Connected AWS account | `385427225795` |
| Bucket region | `ap-southeast-2` / Sydney |
| CloudFormation stack | `hydrotec-staging` — `CREATE_COMPLETE` |
| CloudFront distribution | `ESG2EEOI9127P` — `Deployed` |
| Storage bucket | `hydrotec-staging-websitebucket-p72h45dnfpql` |
| Initial website source commit | `e13d2f58fd5ec5eec789799738a4594828d138fc` |
| Build origin | `https://d3s90nqnvv0rq0.cloudfront.net` |
| Search indexing | Disabled (`SITE_INDEXABLE=0`) |
| Initial release payload | 42 files, 3,801,841 bytes, including 23 HTML documents |
| GitHub IAM deployment | Disabled; role/provider not created |

The approved CREATE change set was `hydrotec-staging-e13d2f58-hosting`, ID `af6d46a1-69e5-48ef-99af-42f13075612d`. It added seven hosting resources: the bucket, bucket policy, distribution, origin access control, directory-index function, cache policy and response-headers policy. It did not change business DNS or provision an email backend.

## Page design revision — 30 October 2026

The portfolio and process pages now have distinct layouts. `/projects/` uses a cinematic Broadway on Ann feature and three gallery collections. `/approach/` uses a four-stage process map, anchored explanations and project-documentation details, with no work photographs in its main content. Existing assets are reused; no new images or hosting services were added.

The build/link check passed with 23 pages, 1,189 local references and 137 image tags. Browser review covered desktop and 320, 375 and 768-pixel frames with no document overflow. The Scope jump link and the portfolio's Balconies gallery link were exercised successfully. Live HTTP checks confirmed that both changed pages and the stylesheet match the checked build; the main-content photo counts are four for Our work and zero for Our approach. CloudFront invalidation `I3OCTIO8YR53U9EI5V7N34D0JH` completed for the affected page paths and stylesheet.

The full verification report linked below is the initial deployment snapshot; this revision updates only the two page documents and shared stylesheet. The source changes are committed alongside this record in `edafeo1/noxy`.

## Direct enquiry integration — 30 October 2026

The separately authorised `hydrotec-enquiries` stack is **CREATE_COMPLETE** in
Sydney. It adds nine resources for a public HTTP API, validated Lambda submission,
private encrypted DynamoDB backups with TTL, scoped IAM access and seven-day logs.
The existing hosting stack, AWS account plan and live business DNS were not changed.

The contact page now has a direct **Send enquiry** button configured for the API.
Assets and the contact/privacy documents were uploaded to the existing bucket;
CloudFront invalidation `I7JPSE9N9HVBZ8EGBH4QDE6R5K` refreshes the changed paths.
The private backup and throttling configuration were checked on AWS. The live API
returned HTTP 204 for preflight, 400 for missing required input and 403 for an
unapproved origin. A labelled valid test returned HTTP 503 with SES
`MessageRejected`, because the business identity remains unverified; it retained a
private test backup and correctly avoided showing success.

GitHub run [40931657000](https://github.com/edafeo1/noxy/actions/runs/40931657000)
passed the site build, both CloudFormation schema checks and nine backend tests.
Native template validation and change-set pre-deployment validation also passed.
Security settings were manually reviewed; `cfn-guard` was not installed or run.
Browser visual QA for this form update was unavailable; live HTTP/API and source
checks were performed. See [the verification snapshot](aws-enquiries-verification.json).

The business mailbox verification email was requested. A non-exportable ACM
certificate for the existing root and www domain, plus SES Easy DKIM, now await
five CNAME records at the existing DNS provider. See [exact records and cutover
steps](domain-setup.md). No Google advertising or analytics code or campaign was
enabled.

## Cost choices

The user requested the lowest practical running cost. This release uses static S3/CloudFront hosting with no provisioned application server, database, load balancer or NAT gateway. No paid plan subscription, domain purchase, custom certificate or additional monitoring service was added.

AWS's `GetAccountPlanState` reported the existing account plan as `FREE`, active, with USD 100 in remaining credits at the setup check. The reported expiry is **30 April 2027 at 02:02 Australia/Brisbane**. No account-plan upgrade was performed. This is the AWS account plan, distinct from the CloudFront Free flat-rate subscription: AWS documents that Free Tier accounts cannot use those flat-rate plans. The distribution therefore uses usage-based pricing under the existing account plan.

The current S3 Price List API returned USD 0.025 per GB-month for Sydney Standard storage's first tier (SKU `5QVJMK36NJC9G6DC`). One copy of this 3,801,841-byte payload calculates to approximately **USD 0.000089 per month for storage alone before credits**. This is not a total bill estimate: request charges, traffic, stored versions and other account usage are separate. Billing data and credit balances can lag usage. The account's credits and current free status are not a promise of permanently free hosting.

The bucket retains version history and is retained if the stack is deleted. Future releases should check stored versions and deliberate retention requirements as the project grows. CloudFront/browser caching is set to five minutes for the uploaded static files. No initial cache invalidation was needed because this was a new distribution and the exact live content is checked against the release.

## Verification

The AWS build passed the existing 23-page check: 1,187 local link/asset references, 141 image tags, document anchors, unique titles/IDs, JSON-LD, JavaScript syntax and the real capability PDF. CloudFormation template validation and change-set planning passed; `cfn-lint` also passed for Sydney. The template's S3 public-access, encryption, versioning, signed-origin, HTTPS and scoped-policy settings were manually checked; `cfn-guard` was not run.

Live AWS configuration checks confirmed all four S3 public-access blocks, AES256 encryption, versioning, and the bucket policy's distribution-scoped CloudFront read access and denial of insecure transport. CloudFront is deployed with signed origin access, directory URL routing, compression, HTTPS redirection and the configured custom 404 response.

Live HTTP checks passed for all **42 files**: every served response matched the checked build's SHA-256, including all 23 HTML documents, every image, CSS, JavaScript, the sitemap, robots file and PDF. All HTML uses the AWS canonical origin and disables indexing. Directory URLs served their real documents; an unknown URL returned HTTP 404 with the custom 404 document; HTTP redirected to HTTPS; anonymous direct S3 access returned 403. See [the verification report](aws-staging-verification.json).

## Remaining work

- Automatic GitHub deployment: an organisation service control policy explicitly denied `iam:ListOpenIDConnectProviders`. The current deployment uses `EnableGitHubDeployment=false`; no attempt was made to override the organisation policy. The scoped GitHub role and actual workflow variables must be configured before enabling that workflow.
- The direct enquiry backend is deployed and connected. Business-email verification, production DKIM DNS records and a successful inbox delivery test are still pending; see [enquiry operations](enquiries.md). The form does not claim success when SES rejects a message.
- Production domain, certificate/DNS migration, redirects from old URLs, final content approvals and production indexing are outstanding.

## Reproduce the build

```bash
SITE_ORIGIN=https://d3s90nqnvv0rq0.cloudfront.net SITE_INDEXABLE=0 npm run build
npm run check
```

The deployment used temporary signed upload authorisations. Credentials and signed URLs are not stored in this repository. Source remains in `edafeo1/noxy`; this record does not introduce a second source repository.

## References

- [CloudFront distribution console](https://us-east-1.console.aws.amazon.com/cloudfront/v4/home?region=us-east-1#/distributions/ESG2EEOI9127P)
- [CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/)
- [AWS flat-rate plan account requirements](https://docs.aws.amazon.com/PricingPlanManager/latest/UserGuide/plans.html)
- [Amazon S3 pricing](https://aws.amazon.com/s3/pricing/)
