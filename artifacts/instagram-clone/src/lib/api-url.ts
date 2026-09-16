/**
 * Resolve a relative "/api/..." path against the remote API base URL when
 * one is configured (e.g. a standalone deploy like Cloudflare Pages, where
 * the frontend and backend are not co-located under the same origin).
 *
 * In Replit dev, VITE_API_URL is unset, so this returns the path unchanged
 * and the platform's path-based router proxies it to the api-server artifact.
 */
export function apiUrl(path: string): string {
  const remoteApiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (!remoteApiUrl) return path;
  return `${remoteApiUrl.replace(/\/+$/, "")}${path}`;
}
