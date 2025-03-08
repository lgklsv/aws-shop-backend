import { APIGatewayEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { handler } from "../../lambda/importProductsFile";

jest.mock("@aws-sdk/s3-request-presigner");
const s3Mock = mockClient(S3Client);

describe("importProductsFile lambda function", () => {
  beforeEach(() => {
    s3Mock.reset();
    process.env.BUCKET_NAME = "test-bucket";
    (getSignedUrl as jest.Mock).mockClear();
  });

  it("should return a signed URL when fileName is provided", async () => {
    const mockUrl = "https://signed-url.com/test-file";
    (getSignedUrl as jest.Mock).mockResolvedValue(mockUrl);

    const event: APIGatewayEvent = {
      queryStringParameters: { name: "test-file.txt" },
    } as any;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(mockUrl);
    expect(getSignedUrl).toHaveBeenCalled();
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.any(S3Client),
      expect.any(GetObjectCommand),
      { expiresIn: 60 },
    );
  });

  it("should return a 400 error when fileName is missing", async () => {
    const event: APIGatewayEvent = {
      queryStringParameters: {},
    } as any;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe("Missing fileName");
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it("should return a 500 error when getSignedUrl throws an error", async () => {
    const mockError = new Error("Failed to generate signed URL");
    (getSignedUrl as jest.Mock).mockRejectedValue(mockError);

    const event: APIGatewayEvent = {
      queryStringParameters: { name: "test-file.txt" },
    } as any;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe("Failed to generate signed URL");
  });

  it("should return a generic 500 error when an unexpected error occurs", async () => {
    (getSignedUrl as jest.Mock).mockRejectedValue(null);

    const event: APIGatewayEvent = {
      queryStringParameters: { name: "test-file.txt" },
    } as any;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe("Internal Server Error");
  });
});
