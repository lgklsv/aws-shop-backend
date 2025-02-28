import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE as string;
const STOCKS_TABLE = process.env.STOCKS_TABLE as string;

export async function getProductsById(id: string | undefined | null) {
  if (!id) return null;

  const { Item: product } = await dynamoDB.send(
    new GetCommand({ TableName: PRODUCTS_TABLE, Key: { id } }),
  );

  if (!product) return null;

  const { Item: stock } = await dynamoDB.send(
    new GetCommand({ TableName: STOCKS_TABLE, Key: { product_id: id } }),
  );

  return {
    ...product,
    count: stock?.count || 0,
  };
}
