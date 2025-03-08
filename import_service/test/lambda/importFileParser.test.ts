import { S3Event } from "aws-lambda";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { Readable } from "stream";
import { handler } from "../../lambda/importFileParser";
import { sdkStreamMixin } from "@smithy/util-stream";

const BUCKET_NAME = "lgklsv-import-service-bucket";
const OBJECT_KEY = "uploaded/products.csv";

const s3Mock = mockClient(S3Client);

describe("importFileParser lambda function", () => {
  beforeEach(() => {
    s3Mock.reset();
  });

  it("should process csv file and log records", async () => {
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

    const logSpy = jest.spyOn(console, "log").mockImplementation();

    await handler(mockEvent as S3Event);

    expect(logSpy).toHaveBeenCalledTimes(3);
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({
        col1: "val1",
        col2: "val2",
        col3: "val3",
      }),
    );
    expect(logSpy).toHaveBeenCalledWith("CSV Processing Complete.");

    logSpy.mockRestore();
  });

  it("should skip events from another folders and buckets", async () => {
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
