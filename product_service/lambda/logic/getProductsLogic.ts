import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE as string;
const STOCKS_TABLE = process.env.STOCKS_TABLE as string;

export async function getProductsList() {
  const productsData = await dynamoDB.send(
    new ScanCommand({ TableName: PRODUCTS_TABLE }),
  );

  if (!productsData.Items || productsData.Items.length === 0) {
    return [];
  }

  const stocksData = await dynamoDB.send(
    new ScanCommand({ TableName: STOCKS_TABLE }),
  );

  if (!stocksData.Items || stocksData.Items.length === 0) {
    throw new Error("No stock data found");
  }

  const stockMap: Record<string, number> = {};
  stocksData.Items.forEach((stock) => {
    stockMap[stock.product_id] = stock.count;
  });

  const products = productsData.Items.map((product) => ({
    ...product,
    count: stockMap[product.id] || 0,
  }));

  return products;
}
