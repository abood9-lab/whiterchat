/**
 * Resolve relative API paths. Cloudflare Pages _worker.js tunnel proxies
 * all "/api/*" requests directly to the Azure backend.
 */
export function getApiBaseUrl(): string {
  const remoteApiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (remoteApiUrl) return remoteApiUrl.replace(/\/+$/, "");
  return "";
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!base) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

