import {
  APIGatewayAuthorizerEvent,
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
  StatementEffect,
} from "aws-lambda";

function generatePolicy(
  principalId: string,
  effect: StatementEffect,
  resource: string,
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
}

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent,
): Promise<
  APIGatewayAuthorizerResult | { statusCode: number; body: string }
> => {
  const authHeader = event.authorizationToken;
  const methodArn = event.methodArn;

  if (!authHeader) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  try {
    const [authType, encodedCredentials] = authHeader.split(" ");
    if (authType.toLowerCase() !== "basic") {
      return { statusCode: 403, body: "Forbidden" };
    }

    const decodedCredentials = Buffer.from(
      encodedCredentials,
      "base64",
    ).toString("utf-8");
    const [username, password] = decodedCredentials.split(":");

    const expectedPassword = process.env[username];

    if (expectedPassword && password === expectedPassword) {
      return generatePolicy(username, "Allow", methodArn);
    } else {
      return { statusCode: 403, body: "Forbidden" };
    }
  } catch {
    return { statusCode: 403, body: "Forbidden" };
  }
};
