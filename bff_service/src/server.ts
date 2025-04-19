import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import formBody from "@fastify/formbody";
import "dotenv/config";

const server = Fastify();
server.register(formBody);

const serviceUrls: { [key: string]: string } = {
  cart: process.env.CART_SERVICE_URL!,
  product: process.env.PRODUCT_SERVICE_URL!,
};

interface CacheEntry {
  data: any;
  expiry: number;
}

const cacheStorage = new Map<string, CacheEntry>();

interface CacheOptions {
  expiryInSeconds: number;
  methods?: string[];
}

const routeCacheConfig: Record<string, CacheOptions> = {
  "/product/products": { expiryInSeconds: 120, methods: ["GET"] }, // 2 minutes
};

async function forwardRequest(request: FastifyRequest, reply: FastifyReply) {
  const { recipientServiceName } = request.params as {
    recipientServiceName: string;
  };
  const targetServiceUrl = serviceUrls[recipientServiceName];

  if (!targetServiceUrl) {
    return reply.status(502).send({ error: "Cannot process request" });
  }

  const targetPath = request.url.replace(`/${recipientServiceName}`, "");
  const targetUrl = `${targetServiceUrl}${targetPath}`;
  const method = request.method;

  const cacheConfig = routeCacheConfig[`/${recipientServiceName}${targetPath}`];

  if (
    cacheConfig &&
    (!cacheConfig.methods || cacheConfig.methods.includes(method))
  ) {
    const cachedEntry = cacheStorage.get(targetUrl);
    if (cachedEntry && Date.now() < cachedEntry.expiry) {
      console.log(`Serving ${request.url} from cache`);
      return reply.status(200).send(cachedEntry.data);
    }
  }

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
    headers["content-type"] = headers["content-type"] || "application/json";
  } else {
    delete headers["content-type"];
    delete headers["Content-Type"];
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

    if (
      cacheConfig &&
      (!cacheConfig.methods || cacheConfig.methods.includes(method)) &&
      response.ok
    ) {
      const expiry = Date.now() + cacheConfig.expiryInSeconds * 1000;
      cacheStorage.set(targetUrl, { data: responseData, expiry });
      console.log(`Cached ${request.url}`);
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
