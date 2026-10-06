/**
 * Centralized CORS and Allowed Origins Configuration
 * Shared across Express HTTP middleware and Socket.IO server.
 */

export function getAllowedOrigins(): (string | RegExp)[] {
  const allowedOrigins: (string | RegExp)[] = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
    /\.run\.app$/,
    /\.aistudio\.google\.com$/,
    /\.googleusercontent\.com$/,
    /\.onrender\.com$/,
  ];

  if (process.env.REPLIT_DOMAINS) {
    process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
      const trimmed = d.trim();
      if (trimmed) allowedOrigins.push(`https://${trimmed}`);
    });
  }

  if (process.env.REPLIT_DEV_DOMAIN) {
    const trimmed = process.env.REPLIT_DEV_DOMAIN.trim();
    if (trimmed) allowedOrigins.push(`https://${trimmed}`);
  }

  if (process.env.FRONTEND_ORIGINS) {
    process.env.FRONTEND_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean)
      .forEach((o) => allowedOrigins.push(o));
  }

  if (process.env.FRONTEND_URL) {
    const trimmed = process.env.FRONTEND_URL.trim();
    if (trimmed) allowedOrigins.push(trimmed);
  }

  if (process.env.CORS_ORIGIN) {
    process.env.CORS_ORIGIN.split(",")
      .map((o) => o.trim())
      .filter(Boolean)
      .forEach((o) => allowedOrigins.push(o));
  }

  // Cloudflare Pages domains & WhiterChat custom domains
  allowedOrigins.push(/^https:\/\/([a-z0-9-]+\.)*pages\.dev$/);
  allowedOrigins.push(/^https:\/\/([a-z0-9-]+\.)*whiterchat\.me$/);
  allowedOrigins.push("https://whiterchat.me");

  return allowedOrigins;
}

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // Server-to-server, curl, non-browser requests
  const allowed = getAllowedOrigins();
  return allowed.some((o) =>
    typeof o === "string" ? o === origin : o.test(origin)
  );
}
