import http from 'node:http';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const appId = process.env.APP_ID ?? 'app-b';
const appName = process.env.APP_NAME ?? 'Ứng dụng B';
const appVersion = process.env.APP_VERSION ?? 'dev';
const startedAt = new Date();

function send(response, statusCode, contentType, body, method = 'GET') {
  response.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  });
  response.end(method === 'HEAD' ? undefined : body);
}

function sendJson(response, statusCode, value, method) {
  send(response, statusCode, 'application/json; charset=utf-8', JSON.stringify(value), method);
}

function renderPage() {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${appName} · ${appVersion}</title>
  <style>
    :root { color-scheme: light; font-family: "Be Vietnam Pro", "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #f5f8f5; color: #18251f; }
    main { width: min(68rem, calc(100% - 2rem)); margin: 0 auto; padding: clamp(3rem, 8vw, 7rem) 0; }
    .label { margin: 0 0 1rem; color: #267048; font-size: .85rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
    h1 { max-width: 12ch; margin: 0; font-size: clamp(2.5rem, 8vw, 5.5rem); line-height: 1.04; letter-spacing: -.04em; }
    .summary { max-width: 44rem; margin: 2rem 0 0; color: #53665c; font-size: clamp(1rem, 2vw, 1.25rem); line-height: 1.7; }
    .checks { max-width: 44rem; margin-top: 3rem; padding: 0; list-style: none; border-top: 1px solid #cfddd4; }
    .checks li { display: grid; grid-template-columns: 1.75rem 1fr; gap: .5rem; padding: 1rem 0; border-bottom: 1px solid #dce7df; }
    .checks strong { color: #22613f; }
    nav { display: flex; flex-wrap: wrap; gap: .75rem 1.25rem; margin-top: 2.5rem; }
    a { min-height: 2.75rem; display: inline-flex; align-items: center; color: #235f3f; font-weight: 700; text-underline-offset: .2em; }
    a:focus-visible { outline: 3px solid #277a50; outline-offset: 3px; }
  </style>
</head>
<body>
  <main>
    <p class="label">Mini PaaS · Ứng dụng mẫu</p>
    <h1>${appName}</h1>
    <p class="summary">Ứng dụng độc lập thứ hai dùng để kiểm chứng định tuyến theo đường dẫn, mạng nội bộ và khả năng quan sát trạng thái.</p>
    <ul class="checks" aria-label="Các điều kiện đã đáp ứng">
      <li><strong>01</strong><span>Chạy bằng tiến trình Node.js không có thư viện ngoài.</span></li>
      <li><strong>02</strong><span>Không công khai cổng ứng dụng ra máy chủ.</span></li>
      <li><strong>03</strong><span>Cung cấp điểm kiểm tra sức khỏe và phiên bản.</span></li>
    </ul>
    <nav aria-label="Điểm kiểm tra">
      <a href="health">Xem trạng thái sức khỏe</a>
      <a href="version">Xem thông tin phiên bản</a>
    </nav>
  </main>
</body>
</html>`;
}

const server = http.createServer((request, response) => {
  const method = request.method ?? 'GET';
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  let statusCode = 200;

  if (method !== 'GET' && method !== 'HEAD') {
    statusCode = 405;
    response.setHeader('Allow', 'GET, HEAD');
    sendJson(response, statusCode, { error: 'method_not_allowed' }, method);
  } else if (pathname === '/') {
    send(response, 200, 'text/html; charset=utf-8', renderPage(), method);
  } else if (pathname === '/health') {
    sendJson(response, 200, {
      status: 'ok',
      appId,
      version: appVersion,
      uptimeSeconds: Math.floor(process.uptime()),
      startedAt: startedAt.toISOString(),
    }, method);
  } else if (pathname === '/version') {
    sendJson(response, 200, { appId, name: appName, version: appVersion }, method);
  } else {
    statusCode = 404;
    sendJson(response, statusCode, { error: 'not_found', path: pathname }, method);
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    appId,
    method,
    path: pathname,
    statusCode,
  }));
});

server.listen(port, '0.0.0.0', () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'server_started',
    appId,
    version: appVersion,
    port,
  }));
});

function shutdown(signal) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), event: 'shutdown', signal, appId }));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
