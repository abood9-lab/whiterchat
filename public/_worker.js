export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. API and Socket.IO Proxy to Render Backend
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
      // BACKEND_URL can be set in Cloudflare Pages Environment Variables (defaults to https://whiterchat.onrender.com)
      const backendBase = env.BACKEND_URL || env.VITE_API_URL || 'https://whiterchat.onrender.com';
      const targetUrl = new URL(url.pathname + url.search, backendBase);

      const headers = new Headers(request.headers);
      headers.set('Host', targetUrl.host);
      headers.set('X-Forwarded-Host', url.host);
      headers.set('X-Forwarded-Proto', 'https');
      const clientIp = request.headers.get('CF-Connecting-IP');
      if (clientIp) headers.set('X-Real-IP', clientIp);

      // WebSocket Upgrade pass-through
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
          JSON.stringify({
            error: 'Backend gateway proxy error',
            target: targetUrl.origin,
            message: String(err && err.message ? err.message : err),
            hint: 'Check that your Render backend is running and BACKEND_URL environment variable is set.'
          }),
          {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // 2. Serve static frontend assets from Cloudflare Pages
    let response = await env.ASSETS.fetch(request);

    // 3. SPA Fallback: If asset not found and it is an HTML navigation request, return index.html
    if (response.status === 404 && request.method === 'GET' && !url.pathname.includes('.')) {
      const indexReq = new Request(new URL('/index.html', request.url), request);
      response = await env.ASSETS.fetch(indexReq);
    }

    return response;
  },
};
