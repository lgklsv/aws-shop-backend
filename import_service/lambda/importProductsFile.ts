import { APIGatewayEvent } from "aws-lambda";
import { S3 } from "aws-sdk";

const s3 = new S3();
const BUCKET_NAME = process.env.BUCKET_NAME;

export const handler = async (event: APIGatewayEvent) => {
  try {
    const fileName = event.queryStringParameters?.name;

    if (!fileName) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: "Missing fileName",
      };
    }

    const url = s3.getSignedUrl("getObject", {
      Bucket: BUCKET_NAME,
      Key: `uploaded/${fileName}`,
      Expires: 60,
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: url,
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
