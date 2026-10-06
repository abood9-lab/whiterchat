import dns from "node:dns/promises";
import net from "node:net";

/**
 * Validates whether an IP address is a private, loopback, link-local, or cloud metadata address.
 */
export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;

  // IPv4 checks
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return true;

    const [a, b] = parts;

    // 0.0.0.0/8
    if (a === 0) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 10.0.0.0/8 (Private)
    if (a === 10) return true;
    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16 (Link-Local / Cloud Metadata)
    if (a === 169 && b === 254) return true;
    // 100.64.0.0/10 (Carrier Grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (a >= 224) return true;

    return false;
  }

  // IPv6 checks
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // ::1 (Loopback)
    if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
    // :: (Unspecified)
    if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true;
    // fe80::/10 (Link-Local)
    if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
    // fc00::/7 (Unique Local Address)
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    // IPv4-mapped IPv6 (::ffff:127.0.0.1, etc.)
    if (lower.startsWith("::ffff:")) {
      const v4Part = ip.slice(7);
      return isPrivateIp(v4Part);
    }
    return false;
  }

  return true;
}

/**
 * Validates a target URL against SSRF threats by parsing URL and resolving DNS.
 */
export async function validateSafeUrl(rawUrl: string): Promise<{ safe: boolean; error?: string; urlObj?: URL }> {
  try {
    const parsed = new URL(rawUrl);

    // Only HTTP and HTTPS
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { safe: false, error: "Only HTTP and HTTPS protocols are permitted." };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Reject localhost and known local metadata aliases
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname === "metadata.google.internal" ||
      hostname === "instance-data"
    ) {
      return { safe: false, error: "Access to local or internal hosts is forbidden." };
    }

    // If host is already an IP address
    if (net.isIP(hostname)) {
      if (isPrivateIp(hostname)) {
        return { safe: false, error: "Access to private or local IP ranges is forbidden." };
      }
      return { safe: true, urlObj: parsed };
    }

    // Resolve DNS
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { safe: false, error: "Unable to resolve hostname." };
    }

    for (const record of addresses) {
      if (isPrivateIp(record.address)) {
        return { safe: false, error: "Resolved address points to a restricted internal network." };
      }
    }

    return { safe: true, urlObj: parsed };
  } catch (err: any) {
    return { safe: false, error: err.message || "Invalid URL." };
  }
}

/**
 * Safe fetcher that prevents SSRF, enforces strict timeouts, limits maximum response size,
 * and validates redirect targets.
 */
export async function safeFetchHtml(
  rawUrl: string,
  options: { maxBytes?: number; timeoutMs?: number; maxRedirects?: number } = {}
): Promise<{ ok: boolean; html?: string; finalUrl?: string; error?: string }> {
  const maxBytes = options.maxBytes ?? 200_000;
  const timeoutMs = options.timeoutMs ?? 5000;
  const maxRedirects = options.maxRedirects ?? 3;

  let currentUrl = rawUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    const validation = await validateSafeUrl(currentUrl);
    if (!validation.safe) {
      return { ok: false, error: validation.error };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; WhiterChat-Bot/1.0; +https://whiterchat.me)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      clearTimeout(timer);

      // Handle 3xx Redirects safely
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get("location");
        if (!location) {
          return { ok: false, error: "Redirect location header missing." };
        }
        const resolvedRedirect = new URL(location, currentUrl).toString();
        currentUrl = resolvedRedirect;
        redirectsCount++;
        continue;
      }

      if (!res.ok) {
        return { ok: false, error: `Remote server responded with HTTP status ${res.status}` };
      }

      // Check Content-Type
      const contentType = res.headers.get("content-type") || "";
      if (
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml+xml") &&
        !contentType.includes("text/plain")
      ) {
        return { ok: false, error: "Resource is not an HTML document." };
      }

      // Read response with strict size bounds
      const reader = res.body?.getReader();
      if (!reader) {
        const text = await res.text();
        return { ok: true, html: text.slice(0, maxBytes), finalUrl: currentUrl };
      }

      let html = "";
      let total = 0;
      while (total < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          html += new TextDecoder().decode(value, { stream: true });
          total += value.length;
        }
      }
      reader.cancel().catch(() => {});

      return { ok: true, html, finalUrl: currentUrl };
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === "AbortError") {
        return { ok: false, error: "Connection timed out." };
      }
      return { ok: false, error: err.message || "Failed to fetch remote resource." };
    }
  }

  return { ok: false, error: "Too many redirects." };
}
