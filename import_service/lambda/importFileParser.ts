import { S3Event } from "aws-lambda";
import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import csv from "csv-parser";
import { Readable } from "stream";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const s3 = new S3Client();
const sqs = new SQSClient();
const BUCKET_NAME = "lgklsv-import-service-bucket";
const UPLOADED_FOLDER = "uploaded/";
const PARSED_FOLDER = "parsed/";
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

export const handler = async (event: S3Event): Promise<void> => {
  try {
    if (!SQS_QUEUE_URL) {
      throw new Error("SQS_QUEUE_URL is not set in environment variables");
    }

    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

      if (bucket !== BUCKET_NAME || !key.startsWith(UPLOADED_FOLDER)) {
        console.log(
          `Skipping file from another bucket or folder: ${bucket}/${key}`,
        );
        continue;
      }

      console.log(`Processing file: ${key} from bucket: ${bucket}`);

      const response = await s3.send(
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        }),
      );

      if (!response.Body) {
        throw new Error("Empty response body from S3 bucket");
      }
      const stream = Readable.from(response.Body as any);

      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on("data", async (row) => {
            const messageParams = {
              QueueUrl: SQS_QUEUE_URL,
              MessageBody: JSON.stringify(row),
            };
            await sqs.send(new SendMessageCommand(messageParams));
          })
          .on("end", () => {
            console.log("CSV Processing Complete.");
            resolve(null);
          })
          .on("error", (error) => {
            console.error("Error reading CSV:", error);
            reject(error);
          });
      });

      const newKey = key.replace(UPLOADED_FOLDER, PARSED_FOLDER);

      await s3.send(
        new CopyObjectCommand({
          Bucket: BUCKET_NAME,
          CopySource: `${BUCKET_NAME}/${key}`,
          Key: newKey,
        }),
      );

      await s3.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        }),
      );
    }
  } catch (error) {
    console.error("Error processing event:", error);
    throw error;
  }
};
