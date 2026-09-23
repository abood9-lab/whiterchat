export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api')) {
      const BACKEND_HOST = 'api.whiterchat.me';
      const targetUrl = new URL(url.pathname + url.search, `http://${BACKEND_HOST}`);

      const headers = new Headers(request.headers);
      headers.set('Host', BACKEND_HOST);
      headers.set('X-Forwarded-Host', url.host);
      headers.set('X-Forwarded-Proto', 'https');
      const clientIp = request.headers.get('CF-Connecting-IP');
      if (clientIp) headers.set('X-Real-IP', clientIp);

      if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
        return fetch(targetUrl.toString(), { headers });
      }

      const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
      const proxyRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers,
        body: hasBody ? request.body : undefined,
        redirect: 'manual',
      });

      try {
        const response = await fetch(proxyRequest);
        return response;
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'Backend gateway error', message: String(err) }),
          {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return env.ASSETS.fetch(request);
  },
};
