import { APIGatewayEvent } from "aws-lambda";
import { getProductsById } from "./logic/getProductsByIdLogic";

export const handler = async (event: APIGatewayEvent) => {
  console.log("Incoming Request:", {
    path: event.path,
    method: event.httpMethod,
  });
  try {
    const productId = event.pathParameters?.id;
    
    console.log("Fetching Product:", { productId });
    const product = await getProductsById(productId);

    if (!product) {
      console.log("Product not found:", { productId });

      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Product not found" }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error:
          error && typeof error === "object" && "message" in error
            ? error.message
            : "Internal Server Error",
      }),
    };
  }
};
