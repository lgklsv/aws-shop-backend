import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { Product } from "../types/product";
import { randomUUID } from "crypto";

const client = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(client);
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE as string;
const STOCKS_TABLE = process.env.STOCKS_TABLE as string;

export async function createProductLogic(body: Omit<Product, "id">) {
  const id = randomUUID();

  const transactionParams: TransactWriteCommandInput = {
    TransactItems: [
      {
        Put: {
          TableName: PRODUCTS_TABLE,
          Item: {
            id,
            title: body.title,
            description: body.description,
            price: body.price,
          },
        },
      },
      {
        Put: {
          TableName: STOCKS_TABLE,
          Item: {
            product_id: id,
            count: body.count,
          },
        },
      },
    ],
  };

  console.log("Executing DynamoDB Transaction:", transactionParams);

  const result = await dynamoDB.send(
    new TransactWriteCommand(transactionParams),
  );
  console.log("DynamoDB Transaction executed successfully", result);
}
