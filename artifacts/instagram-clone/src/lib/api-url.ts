/**
 * Resolve relative API paths. Cloudflare Pages _worker.js tunnel proxies
 * all "/api/*" requests directly to the Azure backend.
 */
export function getApiBaseUrl(): string {
  const remoteApiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (remoteApiUrl) return remoteApiUrl.replace(/\/+$/, "");

  // Auto-connect to live Render backend when running on the production domain or Cloudflare Pages
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (
      host === "whiterchat.me" ||
      host === "www.whiterchat.me" ||
      host.endsWith(".pages.dev")
    ) {
      return "https://whiterchat.onrender.com";
    }
  }

  return "";
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!base) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Universally get active Bearer Auth Token from storage
 */
export function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("pixlr_token") ||
    localStorage.getItem("whiterchat_token") ||
    localStorage.getItem("token") ||
    ""
  );
}
