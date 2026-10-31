# Google launch plan

The repository contains a campaign brief in `marketing/google-search-draft.json`.
It is a reviewable draft, not a campaign created in Google Ads. All draft
campaigns are paused, no budget is configured and no advertising tag is live.
Suggested keywords have not been validated with account-specific search-volume
or cost data. Paid search does not purchase organic ranking.

## Ownership and access

Use a Google account controlled by Hydro-Tec, with its own recovery details and
two-step verification. Add a named developer or agency as a separate user where
needed. Do not share passwords, verification codes or payment-card details in
this repository or chat. Before creating anything, check for an existing
Search Console property, Maps profile and Ads account to avoid duplicates.

Still needed: owner account email, existing property/profile/account links or
IDs, the domain's DNS provider, actual business hours and a private verification
address. Billing and advertiser verification must use the real legal business.
No address or opening hours have been invented in the site or campaign draft.

## Search Console and organic search

1. Open <https://search.google.com/search-console> in the owner's Google account.
2. Add the Domain property `hydrotecbuildingprotectiongroup.com.au`. Copy its
   exact Google-issued TXT verification record into the existing DNS zone.
   Retain that record after verification; do not replace other TXT or MX records.
3. An optional URL-prefix property can use `GOOGLE_SITE_VERIFICATION` at build
   time. That public token is not an API credential. It is emitted only for an
   indexable production build. Do not invent a token.
4. Complete the ACM and SES DNS records in `domain-setup.md`, confirm certificate
   issuance and business-domain email authentication, and test production forms.
5. At domain launch, set `SITE_ORIGIN` to the canonical business domain and
   `SITE_INDEXABLE=1`. Set the hosting stack's `EnableIndexing=true` at the same
   launch. Keep staging blocked with a `noindex` response header and HTML meta.
6. Submit `/sitemap.xml`, inspect the home page and key service pages, and check
   that Google can fetch the canonical URLs. Submission does not guarantee
   indexing or ranking. Keep real project pages and unique regional information.

The build includes descriptive titles, service headings, canonical URLs,
Business/Service/Breadcrumb structured data, responsive photographs and internal
links. The old home-page `#who-we-help` link remains valid. The CloudFront
function normalises directory URLs and supports a canonical root/www redirect
once both hostnames and the covering certificate are configured. Map any other
old URLs using the existing site and Search Console before the final cutover.

## Google Business Profile (Maps)

Use <https://business.google.com/> to find and claim an existing Hydro-Tec
profile before creating one. The owner must complete Google's offered
verification method. Choose the most accurate available waterproofing category;
do not add keywords to the registered business name. Use the verified phone,
website and real photos in this project. Add only services actually offered.

If customers are not served at a staffed, signed business address, configure a
service-area business and hide the address from the public. One real business
does not need fabricated Brisbane, Gold Coast and Sunshine Coast offices or
three duplicate profiles. Confirm the practical service area with the owner.
Ask completed-project customers for honest reviews; do not invent or buy them.

## Google Ads (paid enquiries)

Use <https://ads.google.com/> and check for an existing account. Confirm AUD
billing and the business's intended reporting time zone before account creation;
those choices can be difficult to change later. Owner handles billing and any
advertiser verification. Keyword Planner can then validate the draft keywords
and local costs before a budget is committed.

Start with one tightly targeted Search campaign and the strongest service,
rather than dividing a tiny budget between every region and service. The draft
uses exact/phrase intent and separate landing pages. Confirm location targeting
is **Presence: people in or regularly in** the agreed area. Start with Google
Search only; review partner/network expansion and automated recommendations
before enabling them. Do not infer a bid or budget from the business's project
values. Check actual lead quality and search terms before expanding.

No monthly budget has been approved. For most campaigns Google can charge up to
twice the average daily budget on a day and 30.4 times that daily budget in a
month. A future monthly limit must be translated into a reviewed daily setting;
a campaign pause or an alert is not an instantaneous hard cap. Do not publish
these drafts until the owner has chosen a budget and the production checks pass.

## Conversion measurement before activation

Create a GA4 property/web stream and the agreed Google Ads conversion action in
the business account. Their real IDs are still needed. The current site contains
no analytics/advertising scripts or tracking cookies. It already emits the
`hydrotec:enquiry-submitted` event only after a successful backend response and
valid enquiry reference; a button click or form error must never count as a lead.

When IDs are available, implement the tag and an appropriate preferences flow,
update the privacy text and CSP together, and verify in Tag Assistant/GA4
DebugView and Google Ads diagnostics. No tag requests should load before an
applicable consent choice under the selected implementation. Consent Mode alone
is not a consent banner. Send no names, emails, phone numbers, messages, suburb
field values, URL query strings containing personal data, or enhanced-conversion
data. Use the random enquiry reference only for deduplication where appropriate.
Exclude the staging origin and developer tests from conversion reporting.

Use one primary conversion for a received enquiry, counting one per ad click;
keep phone-link clicks as a separate secondary intent event unless real call
measurement is set up. Test one successful form, retry/double-click, validation
error, server failure and a telephone click. Inspect the outgoing payloads before
enabling campaign delivery. Approval of a campaign budget does not replace this
launch check.

## AdSense

AdSense displays other advertisers' banners on this business website. It does
not promote Hydro-Tec or improve organic ranking. It is not installed. If the
owner specifically wants publishing revenue, assess eligibility, owner approval,
publisher ID, consent and ad placement separately after the service site is live.

## Reference documentation

- Search Console verification: <https://support.google.com/webmasters/answer/9008080>
- Business representation: <https://support.google.com/business/answer/3038177>
- Ad spending limits: <https://support.google.com/google-ads/answer/10486637>
- Location options: <https://support.google.com/google-ads/answer/9376662>
- Responsive search ad limits: <https://support.google.com/google-ads/answer/7684791>
- Consent setup: <https://developers.google.com/tag-platform/security/guides/consent>
