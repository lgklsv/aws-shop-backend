import { S3Event } from "aws-lambda";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { Readable } from "stream";
import { sdkStreamMixin } from "@smithy/util-stream";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

const BUCKET_NAME = "lgklsv-import-service-bucket";
const OBJECT_KEY = "uploaded/products.csv";
const PARSED_OBJECT_KEY = "parsed/products.csv";
const SQS_QUEUE_URL =
  "https://sqs.us-east-1.amazonaws.com/248189940965/catalogItemsQueue";

const s3Mock = mockClient(S3Client);
const sqsMock = mockClient(SQSClient);

describe("importFileParser lambda function", () => {
  beforeEach(() => {
    s3Mock.reset();
    sqsMock.reset();
    process.env.SQS_QUEUE_URL = SQS_QUEUE_URL;
  });

  afterEach(() => {
    delete process.env.SQS_QUEUE_URL;
  });

  it("should process csv file and log records", async () => {
    const { handler } = await import("../../lambda/importFileParser");
    const mockEvent = {
      Records: [
        {
          s3: {
            bucket: { name: BUCKET_NAME },
            object: { key: OBJECT_KEY },
          },
        },
      ],
    };

    const mockStream = new Readable();
    mockStream.push("col1,col2,col3\n");
    mockStream.push("val1,val2,val3\n");
    mockStream.push(null);

    const sdkStream = sdkStreamMixin(mockStream);

    s3Mock
      .on(GetObjectCommand, {
        Bucket: BUCKET_NAME,
        Key: OBJECT_KEY,
      })
      .resolves({ Body: sdkStream });

    sqsMock
      .on(SendMessageCommand, {
        QueueUrl: SQS_QUEUE_URL,
        MessageBody: JSON.stringify({
          col1: "val1",
          col2: "val2",
          col3: "val3",
        }),
      })
      .resolves({});

    s3Mock
      .on(CopyObjectCommand, {
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${OBJECT_KEY}`,
        Key: PARSED_OBJECT_KEY,
      })
      .resolves({});

    s3Mock
      .on(DeleteObjectCommand, {
        Bucket: BUCKET_NAME,
        Key: OBJECT_KEY,
      })
      .resolves({});

    const logSpy = jest.spyOn(console, "log").mockImplementation();

    await handler(mockEvent as S3Event);

    expect(sqsMock.commandCalls(SendMessageCommand).length).toBe(1);
    expect(s3Mock.commandCalls(CopyObjectCommand).length).toBe(1);
    expect(s3Mock.commandCalls(DeleteObjectCommand).length).toBe(1);

    expect(logSpy).toHaveBeenCalledWith("CSV Processing Complete.");

    logSpy.mockRestore();
  });

  it("should skip events from another folders and buckets", async () => {
    const { handler } = await import("../../lambda/importFileParser");

    const ANOTHER_BUCKET_NAME = "another-bucket";
    const ANOTHER_FOLDER_NAME = "another-folder";
    const mockEvent = {
      Records: [
        {
          s3: {
            bucket: { name: ANOTHER_BUCKET_NAME },
            object: { key: `${ANOTHER_FOLDER_NAME}/products.csv` },
          },
        },
      ],
    };

    const logSpy = jest.spyOn(console, "log").mockImplementation();

    await handler(mockEvent as S3Event);

    expect(logSpy).toHaveBeenCalledWith(
      `Skipping file from another bucket or folder: ${ANOTHER_BUCKET_NAME}/${ANOTHER_FOLDER_NAME}/products.csv`,
    );

    logSpy.mockRestore();
  });
});
