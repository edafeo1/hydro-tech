# GitHub development workflow

Target repository: **edafeo1/noxy**. The existing repository licence is preserved. The portable source includes the website, original image assets and capability PDF, page generator, link checker, AWS template and these workflows. ChatGPT hosting identity and temporary QA files are excluded from the GitHub copy.

## Build checks

`Build and validate website` runs on pushes, pull requests and manual runs. It uses Node.js 24 to build all documents, checks local links, assets, anchors, metadata and JavaScript syntax, then retains the static output for seven days. There are no package dependencies to install, so the workflow does not run `npm ci` or rely on a nonexistent lockfile.

The workflow actions are pinned to commit SHAs verified against the official action repositories. Update those pins deliberately when updating the workflow.

## AWS staging workflow

`Deploy AWS staging` can be started manually from `main` after the required setup. It is skipped until `AWS_STAGING_ENABLED` is set to `true`. It does not create infrastructure, send contact emails, deploy production or change the business domain.

Before enabling it:

1. Choose the AWS account and create the staging stack from the hosting template.
2. Configure a GitHub `staging` environment with the desired reviewer rules.
3. Configure a narrowly scoped IAM role trusted through GitHub OIDC. Limit its trust to the actual repository and `staging` environment: `repo:edafeo1/noxy:environment:staging`, with audience `sts.amazonaws.com`.
4. Grant that role only the required S3 listing/upload permissions for the staging bucket and CloudFront invalidation access for its staging distribution. Keep production resources outside the role’s scope.
5. Set the real repository/environment variables below.
6. Manually run the workflow and verify the deployed pages and enquiry behaviour.

| Variable | Actual value to provide |
|---|---|
| `AWS_STAGING_ENABLED` | `true` after the staging setup is ready |
| `AWS_REGION` | Region of the staging bucket, for example `ap-southeast-2` |
| `AWS_STAGING_ROLE_ARN` | Scoped IAM role ARN |
| `AWS_STAGING_BUCKET` | Bucket name from the staging stack |
| `AWS_STAGING_DISTRIBUTION_ID` | CloudFront distribution ID from the same stack |
| `AWS_STAGING_ORIGIN` | Exact HTTPS staging origin, with no path or query |

These are configuration values; the workflow obtains short-lived AWS credentials using OIDC. No AWS access keys or account credentials are included in this project. The IAM role, account and staging variables have not been provisioned or selected on the user’s behalf.

Assets are uploaded before HTML and the previous build remains available as a workflow artifact. The upload does not delete bucket objects. This is a practical staging pipeline, not an atomic production release mechanism. The production release and rollback strategy are recorded in `aws-deployment.md` and still need to be finalised before launch.

## Subsequent development

Work on a feature branch, run `npm run build` and `npm run check`, and open a pull request. Once checks pass, review and merge the source change. Public production rollout is a separate operation from the private design preview and the staging workflow.
