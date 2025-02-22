import { APIGatewayEvent } from "aws-lambda";
import { getProductsById } from "./logic/getProductsByIdLogic";

export const handler = async (event: APIGatewayEvent) => {
  try {
    const productId = event.pathParameters?.id;
    const product = getProductsById(productId);

    if (!product) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Product not found" }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
