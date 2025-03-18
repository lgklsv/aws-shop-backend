import * as cdk from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as dotenv from "dotenv";
import path from "node:path";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new lambdaNodejs.NodejsFunction(this, "BasicAuthorizerFunction", {
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../lambda/basicAuthorizer.ts"),
      handler: "handler",
      environment: {
        lgklsv: process.env.lgklsv!,
      },
    });
  }
}
