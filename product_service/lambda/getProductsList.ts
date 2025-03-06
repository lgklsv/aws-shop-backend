import { APIGatewayEvent } from "aws-lambda";
import { getProductsList } from "./logic/getProductsLogic";

exports.handler = async (event: APIGatewayEvent) => {
  console.log("Incoming Request:", {
    path: event.path,
    method: event.httpMethod,
  });

  try {
    const products = await getProductsList();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(products),
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
