# GitHub development workflow

Target repository: **edafeo1/noxy**. The existing repository licence is preserved. The portable source includes the website, original image assets and capability PDF, page generator, link checker, AWS template and these workflows. ChatGPT hosting identity and temporary QA files are excluded from the GitHub copy.

## Build checks

`Build and validate website` runs on pushes, pull requests and manual runs. It uses Node.js 24 to build all documents, checks local links, assets, anchors, metadata and JavaScript syntax, then retains the static output for seven days. There are no package dependencies to install, so the workflow does not run `npm ci` or rely on a nonexistent lockfile.

It also validates the AWS resource template with `cfn-lint` 1.59.0 in a temporary Python virtual environment. This checks the template without an AWS account or creating resources; an authenticated AWS validation and an actual staging deployment are still required.

The workflow actions are pinned to commit SHAs verified against the official action repositories. Update those pins deliberately when updating the workflow.

## AWS staging workflow

`Deploy AWS staging` can be started manually from `main` after the required setup. It is skipped until `AWS_STAGING_ENABLED` is set to `true`. It does not create infrastructure, send contact emails, deploy production or change the business domain.

Current status: AWS hosting is deployed through the connected AWS integration. The GitHub deployment workflow remains disabled, with no deployment role provisioned: an organisation policy denied the IAM provider check. See [the deployment record](aws-staging-status.md). Keep the enable switch off until the IAM issue and real deployment variables are resolved.

Before enabling it:

1. Use Edafe's AWS account and follow [the staging setup guide](aws-setup.md) to create the hosting stack and scoped deployment role.
2. Configure a GitHub `staging` environment with the desired reviewer rules.
3. Configure the role's exact OIDC subject and audience. The default subject for this new repository is `repo:edafeo1@20019420/noxy@1438595013:environment:staging`, with audience `sts.amazonaws.com`. This follows GitHub's immutable-ID format for repositories created after 15 July 2026; if a custom subject has been configured, use its exact value. The hosting template supplies the documented default.
4. Grant that role only the required S3 listing/upload permissions for the staging bucket and CloudFront invalidation access for its staging distribution. Keep production resources outside the role’s scope.
5. Set the real repository Actions variables below. `AWS_STAGING_ENABLED` must be a repository variable because the job condition is evaluated before environment variables load. The setup guide uses repository variables consistently for all values.
6. Manually run the workflow and verify the deployed pages and enquiry behaviour.

| Variable | Actual value to provide |
|---|---|
| `AWS_STAGING_ENABLED` | Repository variable: `true` after the staging setup is ready |
| `AWS_REGION` | Region of the staging bucket, for example `ap-southeast-2` |
| `AWS_STAGING_ROLE_ARN` | Scoped IAM role ARN |
| `AWS_STAGING_BUCKET` | Bucket name from the staging stack |
| `AWS_STAGING_DISTRIBUTION_ID` | CloudFront distribution ID from the same stack |
| `AWS_STAGING_ORIGIN` | Exact HTTPS staging origin, with no path or query |

These are configuration values; the workflow obtains short-lived AWS credentials using OIDC. No AWS access keys or account credentials are included in this project. Account access and hosting are now verified; the GitHub IAM role and deployment variables remain to be configured.

Assets are uploaded before HTML and the previous build remains available as a workflow artifact. The upload does not delete bucket objects. This is a practical staging pipeline, not an atomic production release mechanism. The production release and rollback strategy are recorded in `aws-deployment.md` and still need to be finalised before launch.

## Subsequent development

Work on a feature branch, run `npm run build` and `npm run check`, and open a pull request. Once checks pass, review and merge the source change. Public production rollout is a separate operation from the private design preview and the staging workflow.


## Owner-only security settings

A reviewable ruleset import is prepared at
`infrastructure/github-main-ruleset.json`. It is **disabled**, and has not been
applied to GitHub. The connected repository app exposes source/PR writes but no
administration writes. It cannot activate branch rules or register your MFA device.

In repository Settings → Rules → Rulesets, import the JSON where supported,
confirm the exact successful CI check is `Build, links and assets`, then review
and activate the ruleset. It blocks deletion/force pushes and requires a PR and
passing CI. Zero mandatory approving reviews avoids requiring a second contributor
for the owner's solo workflow. Do not configure a paid upgrade automatically;
private-repository rule availability depends on the existing GitHub plan.

Register two-step verification and recovery methods directly in the owner's
GitHub/AWS account settings. Keep backup codes, passwords and security-device
secrets out of this repository and chat. No additional developer contributor or
persistent access token is needed for the existing source workflow.

The build now checks recognisable credential patterns across reachable Git
history. It prints only the file and credential category, never the matched value.
This is a useful guard, not proof that every possible secret can be detected. If
it flags a real credential, revoke/rotate it through its owner account before
removing it from history; do not paste its value into an issue or chat.

References: <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets>
