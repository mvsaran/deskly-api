const http = require('http');

const PORT = Number(process.env.PORT || process.env.POSTMAN_MOCK_PORT || 4500);
const startedAt = Date.now();

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);

  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, {
      status: 'ok',
      service: 'deskly',
      version: '1.0.0',
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    });
    return;
  }

  sendJson(res, 404, {
    error: 'not_found',
    message: `${req.method} ${url.pathname} is not mocked`,
  });
});

server.listen(PORT, () => {
  console.log(`Deskly mock listening on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
