# AWS deployment handover

The website is portable static output. The included infrastructure template creates a private S3 bucket, a CloudFront distribution, signed origin access control and a small directory-index function for the real multi-page routes. It also returns the custom 404 page for missing objects.

**Status:** staging is deployed in connected AWS account `385427225795`, region `ap-southeast-2`. The public staging URL is https://d3s90nqnvv0rq0.cloudfront.net. The existing AWS Free account plan is retained. Read [the deployment record](aws-staging-status.md) before making changes to the existing stack. Business-domain migration and automatic contact-email delivery remain outstanding.

## 1. Choose the owner and environment

Use Edafe's connected AWS account, as requested. Initial staging uses the generated CloudFront hostname; production hostname and domain control remain to be confirmed. Keep credentials outside this repository and chat. The initial deployment used the connected AWS integration; the CLI examples below require a separately authenticated CLI profile or federation/SSO session.

S3 can be in `ap-southeast-2` for an Australian deployment. CloudFront is global. Review the template’s `PriceClass` against the desired edge coverage before deployment; no traffic or cost estimate has been assumed.

## 2. Create a staging distribution

The existing `hydrotec-staging` stack has `EnableGitHubDeployment=false`. An organisation service control policy denied `iam:ListOpenIDConnectProviders`, so the GitHub provider/role were not provisioned. The examples below show the optional IAM-enabled setup after the necessary permissions are available. If your account already has the provider, additionally pass `ExistingGitHubOidcProviderArn=THE_EXISTING_PROVIDER_ARN`. Check the selected account with `aws sts get-caller-identity` first. Do not create another hosting stack for the current site.

```bash
aws cloudformation validate-template \
  --template-body file://infrastructure/aws-static-site.yml \
  --region ap-southeast-2

aws cloudformation deploy \
  --template-file infrastructure/aws-static-site.yml \
  --stack-name hydrotec-staging \
  --region ap-southeast-2 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides EnableGitHubDeployment=true

aws cloudformation describe-stacks \
  --stack-name hydrotec-staging \
  --region ap-southeast-2 \
  --query 'Stacks[0].Outputs'
```

The staging distribution is publicly reachable through its generated hostname once files are uploaded. The bucket remains private. Use the current private review preview until a publicly reachable staging environment is authorised. Search exclusion is not access control.

The template retains the versioned S3 bucket and any GitHub OIDC provider it creates when a stack is deleted. Any later deletion of retained resources is a separate deliberate action. Reuse an existing or retained provider ARN on subsequent stack creation.

## 3. Build for the selected origin

Use the exact hostname returned by CloudFormation, or the authorised custom hostname. Keep staging indexing disabled:

```bash
SITE_ORIGIN=https://YOUR_DISTRIBUTION_HOSTNAME SITE_INDEXABLE=0 npm run build
npm run check
```

Replace `YOUR_BUCKET_NAME` and `YOUR_DISTRIBUTION_ID` below with the outputs for the intended stack. Verify the account and outputs before uploading:

```bash
aws sts get-caller-identity
aws s3 sync dist/ s3://YOUR_BUCKET_NAME/ --cache-control 'public,max-age=300'
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths '/*'
```

The sync example does not delete other bucket objects. Review retired URLs deliberately during future releases. S3 versioning supports object recovery; it does not by itself provide an atomic multi-file release. For production releases, keep a versioned build artifact and deploy assets before HTML, then verify the release and retain the prior artifact for rollback.

## 4. Configure the final domain

1. Confirm who controls the domain and current DNS, and record the existing entries.
2. Obtain a validated ACM certificate in **us-east-1** covering the exact CloudFront hostname alias.
3. Update the stack with `CustomDomainName` and `CertificateArn`. The starter template supports one custom hostname; plan the apex/`www` canonical redirect before launch if both are needed.
4. Add the required DNS alias/CNAME at the existing provider. Route 53 is optional; moving DNS providers is not necessary to use CloudFront.
5. Build with the final origin and enable indexing only after the launch-readiness items are complete.
6. Verify nested URLs directly, browser back/forward, images, the PDF, enquiry handling, metadata, sitemap and 404 response status.

The template does not change DNS, provision a certificate or move the existing live website.

## 5. Add server-delivered enquiries

Before replacing the email-draft flow, agree on the receiving address and handling requirements. An AWS implementation can use an HTTP API, Lambda and SES. Include server-side validation, explicit success/error responses, request limits, spam controls and delivery monitoring. Verify the SES sender/domain and sending status in the chosen AWS region. Keep visitor text out of application logs where practical. Update the contact disclosure and privacy copy to describe the actual deployed behaviour.

## 6. Move source and automate releases

The source is in `edafeo1/noxy` with passing build/link CI and a manual staging deployment workflow. The hosting template can create its narrowly scoped OIDC role. Follow `aws-setup.md` to connect the real stack outputs and restrict the GitHub `staging` environment to `main`. No long-lived AWS access keys are required. The staging enable switch must be a repository variable; the resource variables may be environment variables. Production rollout is not configured by this workflow.

## Official references

- [CloudFront origin access control](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [CloudFront directory-index rewrite example](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/example_cloudfront_functions_url_rewrite_single_page_apps_section.html)
- [CloudFront certificate requirements](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html)
