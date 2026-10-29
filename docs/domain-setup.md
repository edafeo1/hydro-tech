# Business domain setup

Prepared 30 October 2026 (Australia/Brisbane). The existing website and email DNS have not been changed.

Keep **hydrotecbuildingprotectiongroup.com.au**, including its www address. A second domain purchase or registrar transfer is not required. No Route 53 hosted zone was found in the connected AWS account. Use the current DNS provider, which still needs to be identified by the owner.

## Add validation records at the current DNS provider

These five CNAME records validate the website certificate and authenticate outgoing form emails. They do not switch website traffic or move the existing inbox. Use a normal DNS record (DNS only if the provider offers proxying), with a TTL such as 300 seconds or the provider's default. Some providers automatically append the domain; avoid appending it twice.

| Purpose | Type | Full record name | Value |
| --- | --- | --- | --- |
| Website HTTPS | CNAME | `_c23738d5ce82e0b701b2bf3a22b0c16e.hydrotecbuildingprotectiongroup.com.au.` | `_0e87032fe985b2dad67efee848a38e11.wzccmgtwzk.acm-validations.aws.` |
| Website HTTPS | CNAME | `_83009a516770b8bfc11a4280148b7d79.www.hydrotecbuildingprotectiongroup.com.au.` | `_fa9051568e5255d36d46cc0a8335d24b.wzccmgtwzk.acm-validations.aws.` |
| Email DKIM | CNAME | `74pxsb26dpphkfsuzuxkza2bve7houpp._domainkey.hydrotecbuildingprotectiongroup.com.au` | `74pxsb26dpphkfsuzuxkza2bve7houpp.dkim.amazonses.com` |
| Email DKIM | CNAME | `ufucvyhxuncc7zpizp7davpvc2ii2g7z._domainkey.hydrotecbuildingprotectiongroup.com.au` | `ufucvyhxuncc7zpizp7davpvc2ii2g7z.dkim.amazonses.com` |
| Email DKIM | CNAME | `jyvnj26yrregntx4gqnnlfuthf7ckwpg._domainkey.hydrotecbuildingprotectiongroup.com.au` | `jyvnj26yrregntx4gqnnlfuthf7ckwpg.dkim.amazonses.com` |

Certificate: `arn:aws:acm:us-east-1:385427225795:certificate/c6eb6b31-2743-4870-9e46-7d7fee12e9d9`, in `us-east-1`, requested with export **disabled** for use with CloudFront. Its status is currently **PENDING_VALIDATION**. SES domain DKIM is also awaiting DNS validation. Leave validation records in place for renewal and ongoing signing.

The business mailbox verification email is a separate initial setup step. Clicking it verifies the fixed sender/recipient, but production email authentication also needs the three DKIM records above. These records do not require replacing the domain's current MX or SPF records.

## Web traffic cutover after verification and delivery tests

1. Export or capture the current DNS records and identify the current web host. Keep the existing email records.
2. Wait for the ACM certificate and SES domain identity to be verified. Check a labelled form test in the real business inbox.
3. Update the existing `hydrotec-staging` hosting stack with the validated certificate and both domain aliases; configure www to redirect to the chosen canonical origin. The certificate request alone does not attach either domain to CloudFront.
4. Set the enquiry API's exact allowed origin to the production origin and build with `SITE_ORIGIN=https://hydrotecbuildingprotectiongroup.com.au`, the actual `ENQUIRY_ENDPOINT`, and `SITE_INDEXABLE=1`.
5. Check legacy URLs/anchors and prepare their redirects. Confirm all services, project pages, the PDF, contact flow and 404 behavior at the final hostname.
6. Change only the web-routing records. The www address can be a CNAME to `d3s90nqnvv0rq0.cloudfront.net`. The root domain needs an ALIAS/ANAME/flattened record supported by its current provider; do not put a standard CNAME at the root alongside existing MX/TXT records. Decide the provider-specific root setup before changing anything.
7. Verify HTTPS, the canonical hostname, real inbox delivery, robots/sitemap and mobile behavior after propagation. Keep the previous web record values available for rollback.

No live domain cutover, nameserver move, email-hosting change or advertising campaign has been performed.

