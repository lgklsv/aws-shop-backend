import { APIGatewayEvent } from "aws-lambda";
import { Product } from "./types/product";
import { createProductLogic } from "./logic/createProductLogic";

export const handler = async (event: APIGatewayEvent) => {
  console.log("Incoming Request:", {
    path: event.path,
    method: event.httpMethod,
    headers: event.headers,
    queryStringParameters: event.queryStringParameters,
    body: event.body,
  });

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Missing required fields" }),
      };
    }

    const body = JSON.parse(event.body) as Omit<Product, "id">;

    if (
      !body?.title ||
      !body?.price ||
      !body?.description ||
      body?.count === undefined
    ) {
      console.log("Missing required fields", { body });

      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Missing required fields" }),
      };
    }

    if (typeof body.price !== "number") {
      console.log("Invalid price format", body.price);

      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Invalid price format" }),
      };
    }

    if (typeof body.count !== "number" || body.count < 0) {
      console.log("Count must be a positive number or zero", body.count);

      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Count must be a positive number or zero",
        }),
      };
    }

    await createProductLogic(body);

    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Product and stock created successfully",
      }),
    };
  } catch (error) {
    console.error("Transaction Failed:", error);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error:
          error && typeof error === "object" && "message" in error
            ? `Transaction failed: ${error.message}`
            : "Internal Server Error",
      }),
    };
  }
};
