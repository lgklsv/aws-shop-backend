import { SQSEvent } from "aws-lambda";
import { createProductLogic } from "./logic/createProductLogic";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({});

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

      const createdProduct = await createProductLogic(product);

      const topicArn = process.env.SNS_TOPIC_ARN;
      if (topicArn) {
        const message = {
          Message: JSON.stringify({
            message: "New product created via catalog batch process!",
            id: createdProduct.id,
            title: createdProduct.title,
            description: createdProduct.description,
            price: createdProduct.price,
            count: createdProduct.count,
          }),
          TopicArn: topicArn,
        };

        const command = new PublishCommand(message);

        try {
          await snsClient.send(command);
          console.log(
            "Message published to SNS topic for product:",
            createdProduct.id,
          );
        } catch (err) {
          console.error("Error publishing message:", err);
        }
      } else {
        console.error("SNS_TOPIC_ARN environment variable is not set.");
      }
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
