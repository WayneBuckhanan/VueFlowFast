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
- `sst.config.ts_example_Cognito`
    Creates and connects a user pool, user pool client, and identity pool in AWS Cognito. The example config file also includes an Amplify configuration block to be added to the `main.js` file to connect the `VITE_*` env vars fed to the `sst.aws.StaticSite` component into the AWS Amplify library on the frontend.
    Frontend page `/login` shows how to use the Authenticator component from the AWS Amplify Vue UI library (no need to use Amplify backend services).
- `sst.config.ts_example_DynamoDB`
    Creates an AWS DynamoDB using a single-table design. Includes a global secondary index that allows querying the SK,PK key for many additional access patterns with appropriately designed composite SK values.
    Frontend page `/dynamo` demonstrates communicating directly from the browser to your DynamoDB. *Not a recommended pattern.*
- `sst.config.ts_example_Lambda`
    Creates an AWS Lambda Function that queries a linked DynamoDB table and returns the result.
    This does not include any rate limiting or prevention for denial-of-service or denial-of-wallet type attacks. *Not a recommended pattern.*
- `sst.config.ts_example_APIGateway`
    Demo of creating a REST API via AWS API Gateway version 2. Public route returns a static value from the attached Lambda function. Private routes require a valid jwt access token from authenticating against the attached Cognito User Pool. You can see an example of using these from the frontend page `/gateway` with both unauthenticated and authenticated responses.
- `sst.config.ts_example_Realtime`
    Demonstrates how to use AWS IoT Core to pub/sub topics. Includes a Lambda Function that is triggered by a Rule attached to the specific topic and an example client message directly to the Rule function that does not notify other devices subscribed to that topic (nor is AWS charging for direct Rule invocations).

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

