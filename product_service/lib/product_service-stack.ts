import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambda_event_sources from "aws-cdk-lib/aws-lambda-event-sources";

const BATCH_SIZE = 5;

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTable = dynamodb.Table.fromTableName(
      this,
      "ProductsTable",
      "products",
    );
    const stocksTable = dynamodb.Table.fromTableName(
      this,
      "StocksTable",
      "stocks",
    );

    const catalogItemsQueue = new sqs.Queue(this, "CatalogItemsQueue", {
      queueName: "catalogItemsQueue",
    });

    const catalogBatchProcessFunction = new lambda.Function(
      this,
      "CatalogBatchProcessFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset("lambda"),
        handler: "catalogBatchProcess.handler",
        environment: {
          PRODUCTS_TABLE: productsTable.tableName,
          STOCKS_TABLE: stocksTable.tableName,
        },
      },
    );
    
    productsTable.grantWriteData(catalogBatchProcessFunction);

    catalogBatchProcessFunction.addEventSource(
      new lambda_event_sources.SqsEventSource(catalogItemsQueue, {
        batchSize: BATCH_SIZE,
      }),
    );

    const getProductsListFunction = new lambda.Function(
      this,
      "GetProductsListFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset("lambda"),
        handler: "getProductsList.handler",
        environment: {
          PRODUCTS_TABLE: productsTable.tableName,
          STOCKS_TABLE: stocksTable.tableName,
        },
      },
    );

    productsTable.grantReadData(getProductsListFunction);
    stocksTable.grantReadData(getProductsListFunction);

    const getProductsByIdFunction = new lambda.Function(
      this,
      "GetProductsByIdFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset("lambda"),
        handler: "getProductsById.handler",
        environment: {
          PRODUCTS_TABLE: productsTable.tableName,
          STOCKS_TABLE: stocksTable.tableName,
        },
      },
    );

    productsTable.grantReadData(getProductsByIdFunction);
    stocksTable.grantReadData(getProductsByIdFunction);

    const createProductFunction = new lambda.Function(
      this,
      "CreateProductFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset("lambda"),
        handler: "createProduct.handler",
        environment: {
          PRODUCTS_TABLE: productsTable.tableName,
          STOCKS_TABLE: stocksTable.tableName,
        },
      },
    );

    productsTable.grantReadWriteData(createProductFunction);
    stocksTable.grantReadWriteData(createProductFunction);

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

    productsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createProductFunction),
    );

    const productByIdResource = productsResource.addResource("{id}");

    productByIdResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsByIdFunction),
    );
  }
}
