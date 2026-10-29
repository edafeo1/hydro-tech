# Owner inputs and final launch work

The connected website is implemented. These items determine whether it is ready to replace the existing business website.

## Content to confirm with the owner

- Current trade licence identifiers, applicable work scope and a verification link.
- Insurance details that the owner is comfortable publishing, and the process for supplying certificates.
- Written warranty term, coverage, exclusions, maintenance responsibilities and contact process for the relevant services.
- A genuine portrait and approved short biography for Noxy Adams. Initials are used for the current contact profile; no staff photograph is falsely identified as Noxy.
- Two or more additional documented case studies: building/location, actual defect, work scope, duration, system used and documented result.
- Approved client feedback and permission to publish any names, client logos or identifiable project details.
- The intended response window, inspection booking process and any inspection charges. These are not invented in the site copy.

## Production decisions

- Source repository: `edafeo1/noxy`. AWS staging is deployed in connected account `385427225795` with its existing Free account plan retained. The GitHub deployment role remains pending an organisation IAM permission issue; see `aws-staging-status.md`.
- Domain registrar and DNS control, current hosting and existing redirects.
- Direct contact form is deployed to the existing business inbox. Finish mailbox verification and DKIM DNS records, then verify a labelled enquiry in the real inbox; see `enquiries.md`.
- Privacy wording reviewed against the actual production hosting, analytics and enquiry handling.
- Measurement requirements. No analytics or advertising scripts are included by default.

## Migration and final verification

- Map the old `/services/*-brisbane/` and Gold Coast URLs to the appropriate new pages. Preserve useful inbound links with explicit permanent redirects at the final edge/DNS-hosting configuration.
- Public CloudFront staging was approved and deployed with search indexing disabled. Robots directives do not make that URL private. The separate design preview retains its original private audience.
- Confirm production metadata and canonical origin.
- Run the build and link checks for the production artifact.
- Repeat keyboard, phone and desktop checks for the final deployed environment.
- Backend validation, duplicate, rate-limit and failure tests pass; live failure/backup paths were checked. Complete actual successful delivery after SES verification and a current browser submission check.
- Check page speed using the final domain and production assets, rather than claiming a score from a development preview.
- Capture the prior deployment and DNS settings so the rollout can be reversed.

The site does not claim a fabricated review rating, licence number, warranty period, project duration or measured performance score.
