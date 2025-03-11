import { SQSEvent } from "aws-lambda";
import { createProductLogic } from "./logic/createProductLogic";

export const handler = async (event: SQSEvent) => {
  try {
    for (const record of event.Records) {
      const product = JSON.parse(record.body);
      console.log("Processing product:", product);

      if (
        !product?.title ||
        !product?.price ||
        !product?.description ||
        product?.count === undefined
      ) {
        console.error("Invalid product data:", product);
        continue;
      }

      if (typeof product.price !== "number") {
        console.error("Invalid price format:", product.price);
        continue;
      }

      if (typeof product.count !== "number" || product.count < 0) {
        console.error(
          "Count must be a positive number or zero:",
          product.count,
        );
        continue;
      }

      await createProductLogic(product);
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: "Products processed successfully",
    };
  } catch (error) {
    console.error("Error processing products:", error);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Error processing products",
      }),
    };
  }
};
