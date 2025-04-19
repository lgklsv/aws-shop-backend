import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import "dotenv/config";

const server = Fastify();

const serviceUrls: { [key: string]: string } = {
  cart: process.env.CART_SERVICE_URL!,
  product: process.env.PRODUCT_SERVICE_URL!,
};

async function forwardRequest(request: FastifyRequest, reply: FastifyReply) {
  const { recipientServiceName } = request.params as {
    recipientServiceName: string;
  };
  const targetServiceUrl = serviceUrls[recipientServiceName];

  if (!targetServiceUrl) {
    return reply.status(502).send({ error: "Cannot process request" });
  }

  const targetUrl = `${targetServiceUrl}${request.url.replace(`/${recipientServiceName}`, "")}`;
  const method = request.method;
  const headers = { ...request.headers };
  delete headers["host"];
  delete headers["Host"];
  delete headers["connection"];
  delete headers["upgrade"];
  delete headers["transfer-encoding"];
  delete headers["proxy-connection"];

  delete headers["content-length"];
  delete headers["Content-Length"];

  let body = undefined;
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    body = request.body ? JSON.stringify(request.body) : undefined;
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  try {
    const response: Response = await fetch(targetUrl, {
      method,
      headers: headers as HeadersInit,
      body,
    });

    response.headers.forEach((value, name) => {
      reply.header(name, value);
    });

    let responseData;

    if (response.status !== 204) {
      responseData = await response.json();
    }

    if (!response.ok) {
      return reply
        .status(response.status)
        .send({ error: responseData?.message || "Error from backend service" });
    }

    reply.status(response.status).send(responseData);
  } catch (error: any) {
    console.error("Error forwarding request:", error);
    reply.status(502).send({ error: "Cannot process request" });
  }
}

server.get("/health", (req, res) => {
  return res.send("OK");
});

server.all("/:recipientServiceName/*", forwardRequest);
server.all("/:recipientServiceName", forwardRequest);

server.setNotFoundHandler((_, reply) => {
  reply.status(502).send({ error: "Cannot process request" });
});

const start = async () => {
  try {
    await server.listen({ port: 3000, host: "0.0.0.0" });
    console.log("Server listening on port 3000");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
