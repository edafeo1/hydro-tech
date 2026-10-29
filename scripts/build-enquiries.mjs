import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const Ref = value => ({Ref: value});
const Sub = value => ({'Fn::Sub': value});
const GetAtt = (name, value) => ({'Fn::GetAtt': [name, value]});
const source = await fs.readFile(path.join(root, 'backend/enquiry.py'), 'utf8');
const template = {
  AWSTemplateFormatVersion: '2010-09-09',
  Description: 'Hydro-Tec website enquiries: HTTP API, Lambda, private short-lived backups and SES. No servers or fixed-price email plan.',
  Parameters: {
    AllowedOrigin: {Type: 'String', Default: 'https://d3s90nqnvv0rq0.cloudfront.net', AllowedPattern: '^https://[a-zA-Z0-9.-]+$', Description: 'Exact website origin without a trailing slash.'},
    BusinessEmail: {Type: 'String', Default: 'noxy@hydrotecbuildingprotectiongroup.com.au', AllowedPattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+[.][a-zA-Z]{2,63}$', Description: 'Verify this address in SES in this region before sending. Fixed sender and recipient.'},
    DailyLimit: {Type: 'Number', Default: 100, MinValue: 1, MaxValue: 100, Description: 'Maximum email attempts per UTC day, including failed attempts.'},
  },
  Resources: {
    EnquiryTable: {
      Type: 'AWS::DynamoDB::Table', DeletionPolicy: 'Retain', UpdateReplacePolicy: 'Retain',
      Properties: {BillingMode: 'PAY_PER_REQUEST', AttributeDefinitions: [{AttributeName: 'pk', AttributeType: 'S'}], KeySchema: [{AttributeName: 'pk', KeyType: 'HASH'}], SSESpecification: {SSEEnabled: true}, TimeToLiveSpecification: {AttributeName: 'expiresAt', Enabled: true}},
    },
    SubmissionLogGroup: {Type: 'AWS::Logs::LogGroup', Properties: {LogGroupName: Sub('/aws/lambda/${AWS::StackName}-submit'), RetentionInDays: 7}},
    SubmissionRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {Version: '2012-10-17', Statement: [{Effect: 'Allow', Principal: {Service: 'lambda.amazonaws.com'}, Action: 'sts:AssumeRole'}]},
        Policies: [{PolicyName: 'SubmitEnquiryOnly', PolicyDocument: {Version: '2012-10-17', Statement: [
          {Effect: 'Allow', Action: ['logs:CreateLogStream', 'logs:PutLogEvents'], Resource: GetAtt('SubmissionLogGroup', 'Arn')},
          {Effect: 'Allow', Action: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem'], Resource: GetAtt('EnquiryTable', 'Arn')},
          {Effect: 'Allow', Action: 'ses:SendEmail', Resource: Sub('arn:${AWS::Partition}:ses:${AWS::Region}:${AWS::AccountId}:identity/${BusinessEmail}'), Condition: {StringEquals: {'ses:FromAddress': Ref('BusinessEmail')}, 'ForAllValues:StringEquals': {'ses:Recipients': [Ref('BusinessEmail')]}, Null: {'ses:Recipients': 'false'}}},
        ]}}],
      },
    },
    SubmissionFunction: {
      Type: 'AWS::Lambda::Function', DependsOn: ['SubmissionLogGroup'],
      Properties: {FunctionName: Sub('${AWS::StackName}-submit'), Description: 'Validate and email a building enquiry to the fixed Hydro-Tec inbox.', Runtime: 'python3.13', Architectures: ['arm64'], Handler: 'index.handler', MemorySize: 128, Timeout: 20, Role: GetAtt('SubmissionRole', 'Arn'), Code: {ZipFile: source}, Environment: {Variables: {ENQUIRY_TABLE: Ref('EnquiryTable'), BUSINESS_EMAIL: Ref('BusinessEmail'), ALLOWED_ORIGIN: Ref('AllowedOrigin'), DAILY_LIMIT: Ref('DailyLimit')}}},
    },
    EnquiryApi: {
      Type: 'AWS::ApiGatewayV2::Api',
      Properties: {Name: Sub('${AWS::StackName}-api'), ProtocolType: 'HTTP', CorsConfiguration: {AllowOrigins: [Ref('AllowedOrigin')], AllowMethods: ['POST', 'OPTIONS'], AllowHeaders: ['content-type'], MaxAge: 300}},
    },
    SubmissionIntegration: {Type: 'AWS::ApiGatewayV2::Integration', Properties: {ApiId: Ref('EnquiryApi'), IntegrationType: 'AWS_PROXY', IntegrationUri: GetAtt('SubmissionFunction', 'Arn'), PayloadFormatVersion: '2.0', TimeoutInMillis: 25000}},
    SubmissionRoute: {Type: 'AWS::ApiGatewayV2::Route', Properties: {ApiId: Ref('EnquiryApi'), RouteKey: 'POST /enquiries', AuthorizationType: 'NONE', Target: Sub('integrations/${SubmissionIntegration}')}},
    EnquiryStage: {Type: 'AWS::ApiGatewayV2::Stage', Properties: {ApiId: Ref('EnquiryApi'), StageName: '$default', AutoDeploy: true, DefaultRouteSettings: {ThrottlingRateLimit: 0.5, ThrottlingBurstLimit: 2}}},
    ApiInvokePermission: {Type: 'AWS::Lambda::Permission', Properties: {FunctionName: Ref('SubmissionFunction'), Action: 'lambda:InvokeFunction', Principal: 'apigateway.amazonaws.com', SourceAccount: Ref('AWS::AccountId'), SourceArn: Sub('arn:${AWS::Partition}:execute-api:${AWS::Region}:${AWS::AccountId}:${EnquiryApi}/*/POST/enquiries')}},
  },
  Outputs: {
    EnquiryEndpoint: {Value: Sub('https://${EnquiryApi}.execute-api.${AWS::Region}.${AWS::URLSuffix}/enquiries')},
    EnquiryFunctionName: {Value: Ref('SubmissionFunction')},
    EnquiryTableName: {Value: Ref('EnquiryTable')},
    BusinessInbox: {Value: Ref('BusinessEmail')},
  },
};
const output = JSON.stringify(template, null, 2) + '\n';
if (Buffer.byteLength(output) > 51200) throw new Error('Enquiry template exceeds the inline CloudFormation size limit.');
await fs.writeFile(path.join(root, 'infrastructure/aws-enquiries.json'), output);
console.log(`Built enquiry infrastructure: ${Object.keys(template.Resources).length} resources, ${Buffer.byteLength(output)} bytes.`);
