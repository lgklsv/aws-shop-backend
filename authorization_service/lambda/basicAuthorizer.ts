import {
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

export const handler = async (event: APIGatewayTokenAuthorizerEvent) => {
  const authHeader = event.authorizationToken;
  const methodArn = event.methodArn;

  if (!authHeader) {
    return generatePolicy("user", "Deny", methodArn);
  }

  try {
    const [authType, encodedCredentials] = authHeader.split(" ");
    if (authType.toLowerCase() !== "basic") {
      return generatePolicy("user", "Deny", methodArn);
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
      return generatePolicy("user", "Deny", methodArn);
    }
  } catch {
    return generatePolicy("user", "Deny", methodArn);
  }
};
