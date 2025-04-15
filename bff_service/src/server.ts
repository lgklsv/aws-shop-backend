import Fastify, { FastifyReply, FastifyRequest } from 'fastify';

const server = Fastify();

// TODO: use env variables
const cartServiceUrl = 'https://k1odwm4mp7.execute-api.us-east-1.amazonaws.com/api';
const productServiceUrl = 'https://pfwblnli9d.execute-api.us-east-1.amazonaws.com/prod';

const serviceUrls: { [key: string]: string } = {
  cart: cartServiceUrl,
  product: productServiceUrl,
};

async function forwardRequest(request: FastifyRequest, reply: FastifyReply) {
  const { recipientServiceName } = request.params as { recipientServiceName: string };
  const targetServiceUrl = serviceUrls[recipientServiceName];

  if (!targetServiceUrl) {
    return reply.status(502).send({ error: 'Cannot process request' });
  }

  const targetUrl = `${targetServiceUrl}${request.url.replace(`/${recipientServiceName}`, '')}`;
  const method = request.method;
  const headers = { ...request.headers };
  delete headers['host'];

  let body = undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    body = request.body ? JSON.stringify(request.body) : undefined;
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  try {
    const response: Response = await fetch(targetUrl, {
      method,
      headers: headers as HeadersInit,
      body,
    });

    let responseData = await response.json();

    if (!response.ok) {
      return reply
        .status(response.status)
        .send({ error: responseData.message || 'Error from backend service' });
    }

    reply.status(response.status).send(responseData);
  } catch (error: any) {
    console.error('Error forwarding request:', error);
    reply.status(502).send({ error: 'Cannot process request' });
  }
}

server.get('/health', (req, res) => {
  return res.send('OK');
});

server.all('/:recipientServiceName/*', forwardRequest);
server.all('/:recipientServiceName', forwardRequest);

server.setNotFoundHandler((_, reply) => {
  reply.status(502).send({ error: 'Cannot process request' });
});

const start = async () => {
  try {
    await server.listen({ port: 3000 });
    console.log('Server listening on port 3000');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
