# Hydro-Tec website rebuild

A connected, cinematic website for Hydro-Tec Building Protection Group. The build produces **23 complete HTML documents**: 22 content pages and a 404 page. Navigation uses ordinary document URLs, not a single-page mockup or hash router.

GitHub development repository: [edafeo1/noxy](https://github.com/edafeo1/noxy). See [the GitHub workflow guide](docs/github-setup.md) for automatic build checks and the separately configured AWS staging deployment.

AWS will use Edafe's account. Follow [the AWS staging setup](docs/aws-setup.md) to upload the hosting template and connect the scoped GitHub deployment role. No AWS resources have been created yet.

## Develop

Requirements: Node.js 22 or newer. The static build has no third-party package dependencies.

```bash
npm run build
npm run check
```

In the managed workspace:

```bash
sites-preview start /workspace/sites/hydrotec-cinema
```

Outside this workspace, serve `dist/` with a static file server that resolves directory `index.html` files. For example, Python’s standard server:

```bash
python3 -m http.server 8080 --directory dist
```

## Source layout

| Path | Purpose |
|---|---|
| `src/content.mjs` | Company details, six services, gallery metadata, FAQs and process copy |
| `src/site.css` | Shared visual system, responsive layouts, keyboard focus and reduced motion |
| `src/app.js` | Mobile navigation, card rows, gallery filters and viewer, enquiry preparation |
| `scripts/build.mjs` | Shared layouts, individual pages, metadata, sitemap and static build |
| `scripts/check.mjs` | Internal links, asset references, anchors, titles, IDs and syntax checks |
| `dist/` | Portable, deployable website |
| `infrastructure/aws-static-site.yml` | AWS hosting template and optional scoped GitHub staging role |
| `docs/aws-setup.md` | First-time AWS account and GitHub staging setup |
| `docs/aws-deployment.md` | AWS setup, deployment and production handover |
| `docs/launch-readiness.md` | Remaining owner inputs and launch decisions |

## Routes

- `/`
- `/services/` and six individual service pages
- `/projects/`, `/projects/broadway-on-ann/`, `/projects/gallery/`
- `/approach/`, `/who-we-help/`, `/about/`
- `/faqs/`, `/quality-and-warranty/`
- `/contact/`, `/privacy/`
- `/service-areas/`, plus Brisbane, Gold Coast and Sunshine Coast pages
- `/404.html`

Every service links to related services, project information and a contextual enquiry. Every document shares the navigation and footer. The gallery supports category URLs, accessible filter buttons, keyboard navigation and a native dialog photo viewer.

## Enquiries

The current implementation is a working **review → email draft** flow. It validates four essentials, incorporates optional project details, shows a preview, and opens a populated email in the visitor’s email application. A copy fallback is available. It does not claim to send mail automatically, and it does not send a network request or store a visitor’s draft.

A native, server-delivered contact form is a separate production integration. The recommended AWS implementation is API Gateway + Lambda + SES, with an owner-approved destination, verified sender, server-side validation, abuse protection and delivery monitoring. This service has not been provisioned or connected.

## Production build

The preview is excluded from search indexing. Before the final domain deployment:

```bash
SITE_ORIGIN=https://hydrotecbuildingprotectiongroup.com.au SITE_INDEXABLE=1 npm run build
npm run check
```

Only enable indexing once the domain, business content and production enquiry handling are ready. `SITE_ORIGIN` controls canonical URLs, social metadata, structured data and sitemap entries. Site registration metadata belongs in `.openai/hosting.json`; never copy a different project identity into an existing checkout.

## Content grounding

Copy and photographs were adapted from the existing Hydro-Tec website and its two-page capability statement. The statement confirms Noxy Adams as the contact and the four-part scope of two Broadway on Ann balcony restorations. No project duration, warranty period, licence number, named insurer, testimonial or measured long-term outcome has been invented. General gallery images are not presented as additional named case studies.

The original capability statement is included at `/assets/hydro-tec-capability-statement.pdf`. See the launch-readiness document for the business details still needed.
