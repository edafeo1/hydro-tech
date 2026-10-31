import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const Ref = value => ({Ref: value});
const Sub = value => ({'Fn::Sub': value});
const GetAtt = (name, value) => ({'Fn::GetAtt': [name, value]});
const If = (condition, yes, no) => ({'Fn::If': [condition, yes, no]});
const recipient = If('HasRecipient', Ref('RecipientEmail'), Ref('BusinessEmail'));
const alerts = If('HasAlerts', [Ref('AlertTopic')], Ref('AWS::NoValue'));
const workerSource = await fs.readFile(path.join(root, 'backend/delivery.py'), 'utf8');
const source = await fs.readFile(path.join(root, 'backend/enquiry.py'), 'utf8');
const template = {
  AWSTemplateFormatVersion: '2010-09-09',
  Description: 'Hydro-Tec website enquiries: HTTP API, encrypted delivery queue, private backups, SES and operator alarms. No servers or fixed-price email plan.',
  Parameters: {
    AllowedOrigin: {Type: 'String', Default: 'https://d3s90nqnvv0rq0.cloudfront.net', AllowedPattern: '^https://[a-zA-Z0-9.-]+$', Description: 'Exact website origin without a trailing slash.'},
    BusinessEmail: {Type: 'String', Default: 'noxy@hydrotecbuildingprotectiongroup.com.au', AllowedPattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+[.][a-zA-Z]{2,63}$', Description: 'Verify this address in SES in this region before sending. Fixed verified sender. Recipient can be configured separately.'},
    RecipientEmail: {Type: 'String', Default: '', AllowedPattern: '^$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+[.][a-zA-Z]{2,63}$', Description: 'Optional fixed recipient. Empty uses the sender. Verify recipients while SES is sandboxed.'},
    AlertEmail: {Type: 'String', Default: '', AllowedPattern: '^$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+[.][a-zA-Z]{2,63}$', Description: 'Optional operator inbox for metadata-only CloudWatch alerts; confirm its SNS subscription.'},
    DailyLimit: {Type: 'Number', Default: 100, MinValue: 1, MaxValue: 100, Description: 'Maximum accepted submission attempts per UTC day. Worker retries are bounded by the queue.'},
  },
  Conditions: {HasRecipient: {'Fn::Not': [{'Fn::Equals': [Ref('RecipientEmail'), '']}]}, HasAlerts: {'Fn::Not': [{'Fn::Equals': [Ref('AlertEmail'), '']}] }},
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
          {Effect: 'Allow', Action: 'sqs:SendMessage', Resource: GetAtt('DeliveryQueue', 'Arn')},
        ]}}],
      },
    },
    SubmissionFunction: {
      Type: 'AWS::Lambda::Function', DependsOn: ['SubmissionLogGroup'],
      Properties: {FunctionName: Sub('${AWS::StackName}-submit'), Description: 'Validate, save and queue an enquiry reference; no email permission.', Runtime: 'python3.13', Architectures: ['arm64'], Handler: 'index.handler', MemorySize: 128, Timeout: 20, Role: GetAtt('SubmissionRole', 'Arn'), Code: {ZipFile: source}, Environment: {Variables: {ENQUIRY_TABLE: Ref('EnquiryTable'), DELIVERY_QUEUE_URL: Ref('DeliveryQueue'), ALLOWED_ORIGIN: Ref('AllowedOrigin'), DAILY_LIMIT: Ref('DailyLimit')}}},
    },
    DeliveryDeadLetterQueue: {
      Type: 'AWS::SQS::Queue', DeletionPolicy: 'RetainExceptOnCreate', UpdateReplacePolicy: 'Retain',
      Properties: {QueueName: Sub('${AWS::StackName}-failed.fifo'), FifoQueue: true, SqsManagedSseEnabled: true, MessageRetentionPeriod: 1209600, RedriveAllowPolicy: {redrivePermission: 'byQueue', sourceQueueArns: [Sub('arn:${AWS::Partition}:sqs:${AWS::Region}:${AWS::AccountId}:${AWS::StackName}-delivery.fifo')]}},
    },
    DeliveryQueue: {
      Type: 'AWS::SQS::Queue', DeletionPolicy: 'RetainExceptOnCreate', UpdateReplacePolicy: 'Retain',
      Properties: {QueueName: Sub('${AWS::StackName}-delivery.fifo'), FifoQueue: true, SqsManagedSseEnabled: true, VisibilityTimeout: 120, MessageRetentionPeriod: 345600, ReceiveMessageWaitTimeSeconds: 20, RedrivePolicy: {deadLetterTargetArn: GetAtt('DeliveryDeadLetterQueue', 'Arn'), maxReceiveCount: 5}},
    },
    QueueTransportPolicy: {Type: 'AWS::SQS::QueuePolicy', Properties: {Queues: [Ref('DeliveryQueue')], PolicyDocument: {Version: '2012-10-17', Statement: [{Sid: 'DenyInsecureRequests', Effect: 'Deny', Principal: '*', Action: 'sqs:*', Resource: GetAtt('DeliveryQueue', 'Arn'), Condition: {Bool: {'aws:SecureTransport': 'false'}}}]}}},
    FailedQueueTransportPolicy: {Type: 'AWS::SQS::QueuePolicy', Properties: {Queues: [Ref('DeliveryDeadLetterQueue')], PolicyDocument: {Version: '2012-10-17', Statement: [{Sid: 'DenyInsecureRequests', Effect: 'Deny', Principal: '*', Action: 'sqs:*', Resource: GetAtt('DeliveryDeadLetterQueue', 'Arn'), Condition: {Bool: {'aws:SecureTransport': 'false'}}}]}}},
    DeliveryLogGroup: {Type: 'AWS::Logs::LogGroup', Properties: {LogGroupName: Sub('/aws/lambda/${AWS::StackName}-deliver'), RetentionInDays: 7}},
    DeliveryRole: {
      Type: 'AWS::IAM::Role', Properties: {
        AssumeRolePolicyDocument: {Version: '2012-10-17', Statement: [{Effect: 'Allow', Principal: {Service: 'lambda.amazonaws.com'}, Action: 'sts:AssumeRole'}]},
        Policies: [{PolicyName: 'DeliverFixedEnquiryOnly', PolicyDocument: {Version: '2012-10-17', Statement: [
          {Effect: 'Allow', Action: ['logs:CreateLogStream', 'logs:PutLogEvents'], Resource: GetAtt('DeliveryLogGroup', 'Arn')},
          {Effect: 'Allow', Action: ['dynamodb:GetItem', 'dynamodb:UpdateItem'], Resource: GetAtt('EnquiryTable', 'Arn')},
          {Effect: 'Allow', Action: ['sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes'], Resource: GetAtt('DeliveryQueue', 'Arn')},
          {Effect: 'Allow', Action: 'ses:SendEmail', Resource: Sub('arn:${AWS::Partition}:ses:${AWS::Region}:${AWS::AccountId}:identity/${BusinessEmail}'), Condition: {StringEquals: {'ses:FromAddress': Ref('BusinessEmail')}, 'ForAllValues:StringEquals': {'ses:Recipients': [recipient]}, Null: {'ses:Recipients': 'false'}}},
        ]}}],
      },
    },
    DeliveryFunction: {
      Type: 'AWS::Lambda::Function', DependsOn: ['DeliveryLogGroup'],
      Properties: {FunctionName: Sub('${AWS::StackName}-deliver'), Description: 'Deliver queued enquiry references with duplicate checks and bounded retries.', Runtime: 'python3.13', Architectures: ['arm64'], Handler: 'index.handler', MemorySize: 128, Timeout: 20, Role: GetAtt('DeliveryRole', 'Arn'), Code: {ZipFile: workerSource}, Environment: {Variables: {ENQUIRY_TABLE: Ref('EnquiryTable'), BUSINESS_EMAIL: Ref('BusinessEmail'), RECIPIENT_EMAIL: recipient}}},
    },
    DeliveryQueueMapping: {Type: 'AWS::Lambda::EventSourceMapping', Properties: {EventSourceArn: GetAtt('DeliveryQueue', 'Arn'), FunctionName: Ref('DeliveryFunction'), BatchSize: 1, FunctionResponseTypes: ['ReportBatchItemFailures'], Enabled: true}},
    // Alerts contain operational metadata only. No paid customer-managed KMS key is
    // created for this optional SNS topic; customer content stays in DDB/SSE-SQS.
    AlertTopic: {Type: 'AWS::SNS::Topic', Condition: 'HasAlerts', Properties: {TopicName: Sub('${AWS::StackName}-alerts')}},
    AlertSubscription: {Type: 'AWS::SNS::Subscription', Condition: 'HasAlerts', Properties: {TopicArn: Ref('AlertTopic'), Protocol: 'email', Endpoint: Ref('AlertEmail')}},
    AlertTopicPolicy: {Type: 'AWS::SNS::TopicPolicy', Condition: 'HasAlerts', Properties: {Topics: [Ref('AlertTopic')], PolicyDocument: {Version: '2012-10-17', Id: Sub('${AWS::StackName}-alerts-policy'), Statement: [
      {Sid: 'AllowStackCloudWatchAlarms', Effect: 'Allow', Principal: {Service: 'cloudwatch.amazonaws.com'}, Action: 'sns:Publish', Resource: Ref('AlertTopic'), Condition: {StringEquals: {'aws:SourceAccount': Ref('AWS::AccountId')}, ArnLike: {'aws:SourceArn': Sub('arn:${AWS::Partition}:cloudwatch:${AWS::Region}:${AWS::AccountId}:alarm:${AWS::StackName}-*')}}},
      {Sid: 'DenyInsecureRequests', Effect: 'Deny', Principal: '*', Action: ['sns:GetDataProtectionPolicy', 'sns:ListTagsForResource', 'sns:PutDataProtectionPolicy', 'sns:AddPermission', 'sns:DeleteTopic', 'sns:GetTopicAttributes', 'sns:ListSubscriptionsByTopic', 'sns:Publish', 'sns:RemovePermission', 'sns:SetTopicAttributes', 'sns:Subscribe'], Resource: Ref('AlertTopic'), Condition: {Bool: {'aws:SecureTransport': 'false'}}},
    ]}}},
    SubmissionFailureMetric: {Type: 'AWS::Logs::MetricFilter', Properties: {LogGroupName: Ref('SubmissionLogGroup'), FilterPattern: '{ $.event = "enquiry_queue_failed" }', MetricTransformations: [{MetricNamespace: Sub('HydroTec/${AWS::StackName}'), MetricName: 'AttentionRequired', MetricValue: '1', DefaultValue: 0}]}},
    DeliveryAttentionMetric: {Type: 'AWS::Logs::MetricFilter', Properties: {LogGroupName: Ref('DeliveryLogGroup'), FilterPattern: '{ $.event = "enquiry_delivery_attention" }', MetricTransformations: [{MetricNamespace: Sub('HydroTec/${AWS::StackName}'), MetricName: 'AttentionRequired', MetricValue: '1', DefaultValue: 0}]}},
    AttentionAlarm: {Type: 'AWS::CloudWatch::Alarm', Properties: {AlarmName: Sub('${AWS::StackName}-attention'), AlarmDescription: 'Enquiry delivery needs an operator check. Inspect reference-only logs and the failed queue.', Namespace: Sub('HydroTec/${AWS::StackName}'), MetricName: 'AttentionRequired', Statistic: 'Sum', Period: 60, EvaluationPeriods: 1, Threshold: 1, ComparisonOperator: 'GreaterThanOrEqualToThreshold', TreatMissingData: 'notBreaching', AlarmActions: alerts}},
    FailedQueueAlarm: {Type: 'AWS::CloudWatch::Alarm', Properties: {AlarmName: Sub('${AWS::StackName}-failed-queue'), AlarmDescription: 'A queued reference exhausted its retries. Investigate before redriving.', Namespace: 'AWS/SQS', MetricName: 'ApproximateNumberOfMessagesVisible', Dimensions: [{Name: 'QueueName', Value: GetAtt('DeliveryDeadLetterQueue', 'QueueName')}], Statistic: 'Maximum', Period: 60, EvaluationPeriods: 1, Threshold: 1, ComparisonOperator: 'GreaterThanOrEqualToThreshold', TreatMissingData: 'notBreaching', AlarmActions: alerts}},
    ApiFailureAlarm: {Type: 'AWS::CloudWatch::Alarm', Properties: {AlarmName: Sub('${AWS::StackName}-api-errors'), AlarmDescription: 'The enquiry API returned a server error. Check reference-only submission logs.', Namespace: 'AWS/ApiGateway', MetricName: '5xx', Dimensions: [{Name: 'ApiId', Value: Ref('EnquiryApi')}], Statistic: 'Sum', Period: 60, EvaluationPeriods: 1, Threshold: 1, ComparisonOperator: 'GreaterThanOrEqualToThreshold', TreatMissingData: 'notBreaching', AlarmActions: alerts}},
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
    BusinessInbox: {Value: recipient},
    DeliveryFunctionName: {Value: Ref('DeliveryFunction')},
    DeliveryQueueUrl: {Value: Ref('DeliveryQueue')},
    FailedQueueUrl: {Value: Ref('DeliveryDeadLetterQueue')},
  },
};
const output = JSON.stringify(template, null, 2) + '\n';
if (Buffer.byteLength(output) > 51200) throw new Error('Enquiry template exceeds the inline CloudFormation size limit.');
await fs.writeFile(path.join(root, 'infrastructure/aws-enquiries.json'), output);
console.log(`Built enquiry infrastructure: ${Object.keys(template.Resources).length} resources, ${Buffer.byteLength(output)} bytes.`);
