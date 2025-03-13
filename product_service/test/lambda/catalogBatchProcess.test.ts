import { SQSEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { handler } from "../../lambda/catalogBatchProcess";
import { createProductLogic } from "../../lambda/logic/createProductLogic";

jest.mock("../../lambda/logic/createProductLogic");

const mockSnsClient = mockClient(SNSClient);

describe("handler", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockSnsClient.reset();
    process.env.SNS_TOPIC_ARN = "arn:aws:sns:us-east-1:123456789012:MyTopic";
  });

  afterEach(() => {
    delete process.env.SNS_TOPIC_ARN;
  });

  it("should process valid product records and publish to SNS", async () => {
    const mockProduct = {
      id: "123",
      title: "Test Product",
      price: 10,
      description: "Test description",
      count: 5,
    };

    (createProductLogic as jest.Mock).mockResolvedValue(mockProduct);
    mockSnsClient.on(PublishCommand).resolves({});

    const event = {
      Records: [
        {
          messageId: "1",
          receiptHandle: "abc",
          body: JSON.stringify({
            title: "Test Product",
            price: 10,
            description: "Test description",
            count: 5,
          }),
          attributes: {},
          messageAttributes: {},
          md5OfBody: "123",
          eventSource: "aws:sqs",
          eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:MyQueue",
          awsRegion: "us-east-1",
        },
      ],
    };

    const result = await handler(event as SQSEvent);

    expect(result.statusCode).toBe(200);
    expect(mockSnsClient.commandCalls(PublishCommand).length).toBe(1);
    expect(createProductLogic).toHaveBeenCalledWith({
      title: "Test Product",
      price: 10,
      description: "Test description",
      count: 5,
    });

    const publishCommand =
      mockSnsClient.commandCalls(PublishCommand)[0].args[0].input;
    expect(publishCommand.TopicArn).toBe(
      "arn:aws:sns:us-east-1:123456789012:MyTopic",
    );
    if (publishCommand.Message && publishCommand.MessageAttributes) {
      const parsedMessage = JSON.parse(publishCommand.Message);
      expect(parsedMessage.id).toBe("123");
      expect(parsedMessage.title).toBe("Test Product");
      expect(publishCommand.MessageAttributes.price.StringValue).toBe("10");
    }
  });

  it("should handle invalid product data (missing fields)", async () => {
    const event = {
      Records: [
        {
          messageId: "1",
          receiptHandle: "abc",
          body: JSON.stringify({
            title: "Test Product",
            price: 10,
          }),
          attributes: {},
          messageAttributes: {},
          md5OfBody: "123",
          eventSource: "aws:sqs",
          eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:MyQueue",
          awsRegion: "us-east-1",
        },
      ],
    };

    const result = await handler(event as SQSEvent);

    expect(result.statusCode).toBe(200);
    expect(mockSnsClient.commandCalls(PublishCommand).length).toBe(0);
    expect(createProductLogic).not.toHaveBeenCalled();
  });

  it("should handle invalid price format", async () => {
    const event = {
      Records: [
        {
          messageId: "1",
          receiptHandle: "abc",
          body: JSON.stringify({
            title: "Test Product",
            price: "invalid",
            description: "Test description",
            count: 5,
          }),
          attributes: {},
          messageAttributes: {},
          md5OfBody: "123",
          eventSource: "aws:sqs",
          eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:MyQueue",
          awsRegion: "us-east-1",
        },
      ],
    };

    const result = await handler(event as SQSEvent);

    expect(result.statusCode).toBe(200);
    expect(mockSnsClient.commandCalls(PublishCommand).length).toBe(0);
    expect(createProductLogic).not.toHaveBeenCalled();
  });

  it("should handle invalid count format", async () => {
    const event = {
      Records: [
        {
          messageId: "1",
          receiptHandle: "abc",
          body: JSON.stringify({
            title: "Test Product",
            price: 10,
            description: "Test description",
            count: -1,
          }),
          attributes: {},
          messageAttributes: {},
          md5OfBody: "123",
          eventSource: "aws:sqs",
          eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:MyQueue",
          awsRegion: "us-east-1",
        },
      ],
    };

    const result = await handler(event as SQSEvent);

    expect(result.statusCode).toBe(200);
    expect(mockSnsClient.commandCalls(PublishCommand).length).toBe(0);
    expect(createProductLogic).not.toHaveBeenCalled();
  });
});
