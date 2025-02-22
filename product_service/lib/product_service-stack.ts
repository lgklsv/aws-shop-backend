import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsListFunction = new lambda.Function(
      this,
      "GetProductsListFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset("lambda"),
        handler: "getProductsList.handler",
      },
    );

    const getProductsByIdFunction = new lambda.Function(
      this,
      "GetProductsByIdFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset("lambda"),
        handler: "getProductsById.handler",
      },
    );

    const api = new apigateway.LambdaRestApi(this, "ProductsApi", {
      handler: getProductsListFunction,
      proxy: false,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    const productsResource = api.root.addResource("products");

    productsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsListFunction),
    );

    const productByIdResource = productsResource.addResource("{id}");

    productByIdResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsByIdFunction),
    );
  }
}
