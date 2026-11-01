# Code walkthrough: a clearer Hydro-Tec site

This release keeps the detailed business information while making the first visit
easier to understand. The Google account, domain launch and paid-advertising work
are outside this release.

## 1. Understand the project

`src/content.mjs` contains company details, six services, gallery photographs,
FAQs and the process. `scripts/build.mjs` reads that content and produces the real
HTML pages in `dist/`. `src/site.css` supplies the shared design, and `src/app.js`
adds navigation, the gallery and contact submission. There is no client framework
or JavaScript package dependency to install for the normal build.

## 2. Make the first screen explain the business

The home-page HTML now starts with:

```html
<h1>Waterproofing &amp;<br>
  <span>building repairs.</span>
</h1>
```

The paragraph explains that Hydro-Tec repairs leaking balconies, rooftops and
exterior walls for apartment and commercial buildings. Location and the next
action remain visible. A short fit-check section then connects visible problems
to the appropriate service page. The fuller information remains on the service,
project, audience, FAQ and quality pages.

A before/after data comparison confirmed the existing company details, complete
service information, gallery, FAQs and process were unchanged. Homepage wording
and presentation were simplified; the detailed source information was retained.

## 3. Separate a friendly card title from the service value

For example, a service now has both:

```js
label: 'Rope access',
cardTitle: 'Exterior repairs at height',
```

The card displays `service.cardTitle || service.label`. The original `label`
continues to supply the contact-form option and the server's allowed service
value. Changing only the display title avoids breaking validated submissions.

## 4. Adjust the shared CSS

The two primary-button colours are shared variables:

```css
--blue: #2d5fe6;
--blue-hover: #3868eb;
```

White text has approximately 5.40:1 contrast on the normal colour and 4.83:1 on
hover. This describes those buttons, not a claim of full-site WCAG certification.

The Broadway project had horizontal overflow at 320 pixels. Grid tracks now use
`minmax(0, ...)`, the child can shrink with `min-width: 0`, and the mobile heading
uses `clamp(60px, 14vw, 79px)`. This keeps its large visual style while fitting the
small screen. The hidden photo viewer also starts without a `src`, so its image
loads only when the visitor opens a photo.

## 5. Use elapsed time for the form's timing check

The browser records:

```js
let formOpenedAt = performance.now();
```

When sending, it includes:

```js
elapsedMs: Math.round(performance.now() - formOpenedAt)
```

The API checks that this is a number within the permitted interval, rejecting
booleans, invalid numbers and out-of-range values. This avoids rejecting a real
visitor just because their device clock differs from AWS. The old `startedAt`
field is still supported so cached pages keep working during deployment. Timing
is an abuse heuristic; required fields, validation and rate limits still apply.

The browser now also requires the returned reference to equal
`HT-${submissionId}` before showing success or emitting the existing conversion
hook. No Google tracking script was added.

## 6. Keep every unprocessed queue message after a failure

The worker processes queue records in order. At the first failure, it returns
the failed record and every record it has not processed:

```python
failures.extend(
    {"itemIdentifier": pending["messageId"]}
    for pending in records[index:]
)
break
```

AWS can retry those references. The live configuration still uses batch size
one; the change protects the handler if that configuration grows in future.
Existing duplicate checks, fixed recipients, private backups and handling of
ambiguous email responses remain in place.

## 7. Test at real CSS viewport widths

Build the development-only responsive viewer with:

```sh
SITE_INDEXABLE=0 SITE_QA_PREVIEW=1 npm run build
```

Serve the site and open `/__qa__/`. Select a page and 320, 375, 768 or 1280 pixels.
The frame uses that CSS viewport and reports overflow. It does not emulate a
physical phone, touch hardware or an iOS keyboard. All 23 pages were checked at
the four widths; menu keyboard behaviour and form validation were checked too.

Use the local viewer for layout/validation. Send a real delivery test from the
AWS preview because the API deliberately accepts that exact origin.

A normal build removes the development viewer. `npm run check` refuses to pass
if it remains in the release directory, preventing accidental publication.

## 8. Check code and history before release

```sh
npm run build
npm run check
python scripts/check-secrets.py
python -m unittest discover -s tests -p 'test_*.py'
```

The Python suite has 23 tests covering submission/delivery boundaries and the
credential-pattern guard. CI builds both staging and production configurations,
validates the CloudFormation schemas and runs the tests. Checkout fetches history
so `python3 scripts/check-secrets.py --history` can check reachable Git blobs.
Findings show the file and credential category, not the matched credential.

This detects recognisable formats, not every possible secret. A real leaked
credential needs revocation through its owner account; deleting a file alone is
not sufficient. Never paste credential values into a review or issue.

## 9. Release and review

Source changes are committed using the owner's GitHub identity. Author and
committer are verified before moving a branch. CI runs before main is advanced.
For the AWS backend, the generated template is validated and its change set is
checked for replacements and validation errors before execution. Static assets
are uploaded before HTML, then the CloudFront cache is invalidated.

The connected app cannot activate GitHub administration settings or register an
owner's MFA device. A disabled ruleset import is prepared in
`infrastructure/github-main-ruleset.json`; it has not been applied. See
`github-setup.md` for the owner-only review steps. No paid upgrade is enabled.

## References

- Clear content: <https://www.w3.org/WAI/tips/writing/>
- Elapsed timing: <https://developer.mozilla.org/en-US/docs/Web/API/Performance/now>
- FIFO failures: <https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html>
