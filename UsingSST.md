# SST AWS branch related specifics

1. Set up AWS access
    - If you already have a `~/.aws/credentials` file from another source, you are probably set. See [set up your IAM Credentials](https://sst.dev/docs/iam-credentials) for more details.
    - If you're setting up AWS from scratch, consider the SST recommended approach to [set up your AWS accounts](https://sst.dev/docs/aws-accounts).

2. Set up SST

```bash
npm install sst
npx sst init
npx sst dev
```

If your working directory contains disallowed characters, the `sst init` will error. No need to run `sst init` again, just edit the `sst.config.ts` file and change the app "name" field to something kebab-cased.

After a few minutes, SST should complete the deployment. That means SST is initialized, connected to AWS, and ready to be used for project deployment. Exit the SST multiplexed dev environment with Ctrl-C and continue.

3. Configure SST

Copy one of the `sst.config.ts_example_*` files to `sst.config.ts` or use them as starting points for your own configurations.

- `sst.config.ts_example_StaticSite`
    On deploy, uses the [sst.aws.StaticSite](https://sst.dev/docs/component/aws/static-site) component to host the output of the Vue build on the web. By default, you'll get an auto-generated Amazon AWS-branded subdomain that is appropriate for testing. If you have a domain name in AWS Route 53, you can easily specify a subdomain as `domain` option or read more about [using custom domains with SST](https://sst.dev/docs/custom-domains).
    **Note** `sst dev` does not deploy the latest static site. The assumption is that you are using the local `npm run dev` in the SST multiplexed dev environment for local testing during dev.

Run `npx sst dev` to get resources configured for a default stage (likely your username). The SST multiplexed dev environment shows subscreens for deployment status, function console for dev mode [Live Functions](https://sst.dev/docs/live), and your StaticSite frontend's `npm run dev` console.

**Note** if you attach a custom domain name, include variations for dev stages and production. The best case scenario is that you will end up with your dev stage on the desired subdomain and get an error when you deploy to production. Worst case, you will unintentionally replace your previously deployed Lambdas with Live Function dev versions that stop working as soon as you close the `sst dev` environment.

4. Deploy with SST

```bash
npx sst deploy
```

Deploys the default stage (likely your username). Will deploy Lambdas native to AWS (rather than the Live Function dev version) and configure all other resources within this stage. This is used for final testing fully on AWS and not for final deployment. This is so multiple developers could deploy the same project into the same AWS organization/account without resources colliding.

```bash
npx sst deploy --stage=production
```

Deploys to production. If you [setup your AWS accounts](https://sst.dev/docs/aws-accounts) as recommended by the SST team, you will be deploying to an independent AWS account within your AWS Organization. You can get a similar effect with multiple [IAM credentials](https://sst.dev/docs/aws-accounts) that can be from one or more AWS accounts/organizations.

