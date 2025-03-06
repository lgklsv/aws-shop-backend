import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({ region: "us-east-1" });

async function populateDatabase() {
  try {
    const products = [
      {
        id: uuidv4(),
        title: "Laptop",
        description: "High-performance laptop",
        price: 1200,
      },
      {
        id: uuidv4(),
        title: "Smartphone",
        description: "Latest smartphone model",
        price: 800,
      },
      {
        id: uuidv4(),
        title: "Headphones",
        description: "Noise-canceling headphones",
        price: 200,
      },
    ];

    for (const product of products) {
      const params = {
        TableName: "products",
        Item: marshall(product),
      };

      await client.send(new PutItemCommand(params));
      console.log(`Product inserted: ${product.id}`);

      const stockParams = {
        TableName: "stocks",
        Item: marshall({
          product_id: product.id,
          count: Math.floor(Math.random() * 100),
        }),
      };

      await client.send(new PutItemCommand(stockParams));
      console.log(`Stock inserted for product: ${product.id}`);
    }

    console.log("Database population complete.");
  } catch (error) {
    console.error("Error populating database:", error);
  }
}

populateDatabase();
