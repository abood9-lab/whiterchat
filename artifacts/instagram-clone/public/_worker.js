export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // If request is for API or WebSocket, proxy directly to the backend tunnel
    if (url.pathname.startsWith("/api") || url.pathname.startsWith("/socket.io")) {
      // Default to backend.whiterchat.me, or use custom BACKEND_URL if specified
      const backendBase = env.BACKEND_URL || "https://backend.whiterchat.me";
      const targetUrl = new URL(url.pathname + url.search, backendBase);

      // Clone headers and set appropriate proxy headers
      const headers = new Headers(request.headers);
      headers.set("Host", targetUrl.host);
      headers.set("X-Forwarded-Host", url.host);
      headers.set("X-Forwarded-Proto", url.protocol);

      try {
        return await fetch(targetUrl.toString(), {
          method: request.method,
          headers: headers,
          body: request.body,
          redirect: "manual"
        });
      } catch (err) {
        return new Response(`Proxy Error: ${err.message}`, { status: 502 });
      }
    }

    // Otherwise, let Cloudflare Pages serve the static frontend assets
    return env.ASSETS.fetch(request);
  }
};
