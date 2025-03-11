import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import path from "node:path";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import * as sqs from "aws-cdk-lib/aws-sqs";

const UPLOADED_FOLDER = "uploaded/";

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = s3.Bucket.fromBucketName(
      this,
      "ImportBucket",
      "lgklsv-import-service-bucket",
    );

    const catalogItemsQueue = new sqs.Queue(this, "CatalogItemsQueue", {
      queueName: "catalogItemsQueue",
    });

    const importProductsFileFunction = new lambdaNodejs.NodejsFunction(
      this,
      "ImportProductsFileFunction",
      {
        runtime: Runtime.NODEJS_22_X,
        entry: path.join(__dirname, "../lambda/importProductsFile.ts"),
        handler: "handler",
        environment: {
          BUCKET_NAME: bucket.bucketName,
        },
      },
    );

    bucket.grantReadWrite(importProductsFileFunction);

    const importFileParserFunction = new lambdaNodejs.NodejsFunction(
      this,
      "ImportFileParserFunction",
      {
        runtime: Runtime.NODEJS_22_X,
        entry: path.join(__dirname, "../lambda/importFileParser.ts"),
        handler: "handler",
        environment: {
          BUCKET_NAME: bucket.bucketName,
          SQS_QUEUE_URL: catalogItemsQueue.queueUrl,
        },
        bundling: {
          nodeModules: ["csv-parser"],
        },
      },
    );

    bucket.grantReadWrite(importFileParserFunction);

    const policy = new iam.PolicyStatement({
      actions: ["s3:PutObject", "s3:DeleteObject"],
      resources: [
        `${bucket.bucketArn}/parsed/*`,
        `${bucket.bucketArn}/uploaded/*`,
      ],
    });

    importFileParserFunction.addToRolePolicy(policy);

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParserFunction),
      { prefix: UPLOADED_FOLDER },
    );

    const api = new apigateway.LambdaRestApi(this, "ImportProductsApi", {
      handler: importProductsFileFunction,
      proxy: false,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    const importResource = api.root.addResource("import");

    importResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFileFunction),
      {
        requestParameters: {
          "method.request.querystring.name": true,
        },
      },
    );
  }
}
