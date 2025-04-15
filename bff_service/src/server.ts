import Fastify from 'fastify';

const server = Fastify();

server.get('/health', (req, res) => {
  return res.send('OK');
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
