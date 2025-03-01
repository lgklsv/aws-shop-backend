import { APIGatewayEvent } from "aws-lambda";
import { getProductsList } from "./logic/getProductsLogic";

exports.handler = async (event: APIGatewayEvent) => {
  try {
    const products = getProductsList();

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
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
