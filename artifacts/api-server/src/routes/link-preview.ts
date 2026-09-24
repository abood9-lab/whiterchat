import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function extractOg(html: string, prop: string): string | null {
  // property="og:X" content="..."  or  content="..." property="og:X"
  const patterns = [
    new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${prop}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
  }
  return null;
}

// GET /link-preview?url=<encoded-url>
router.get("/link-preview", requireAuth, async (req, res): Promise<void> => {
  const { url } = req.query as { url?: string };
  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WhiterChat-LinkBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);

    if (!response.ok) { res.status(422).json({ error: "Remote fetch failed" }); return; }

    // Read at most 200 KB to avoid memory issues with huge pages
    const reader = response.body?.getReader();
    let html = "";
    if (reader) {
      let total = 0;
      while (total < 200_000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += new TextDecoder().decode(value);
        total += value?.length ?? 0;
      }
      reader.cancel().catch(() => {});
    }

    const title       = extractOg(html, "title") || html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1]?.trim() || null;
    const description = extractOg(html, "description") || extractOg(html, "description");
    const image       = extractOg(html, "image");
    const siteName    = extractOg(html, "site_name") || (() => {
      try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
    })();

    res.json({ title, description, image, siteName, url });
  } catch {
    res.status(422).json({ error: "Failed to fetch link preview" });
  }
});

export default router;
