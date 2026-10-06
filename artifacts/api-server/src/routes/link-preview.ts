import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { safeFetchHtml } from "../lib/ssrf";

const router: IRouter = Router();

function extractOg(html: string, prop: string): string | null {
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
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "URL is required" });
    return;
  }

  const cleanUrl = url.trim();

  try {
    const fetchResult = await safeFetchHtml(cleanUrl, {
      maxBytes: 200_000,
      timeoutMs: 5000,
    });

    if (!fetchResult.ok || !fetchResult.html) {
      res.status(422).json({ error: fetchResult.error || "Failed to fetch link preview" });
      return;
    }

    const html = fetchResult.html;
    const finalUrl = fetchResult.finalUrl || cleanUrl;

    const title =
      extractOg(html, "title") ||
      html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1]?.trim() ||
      null;
    const description =
      extractOg(html, "description") ||
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ||
      null;
    const image = extractOg(html, "image");
    const siteName =
      extractOg(html, "site_name") ||
      (() => {
        try {
          return new URL(finalUrl).hostname.replace(/^www\./, "");
        } catch {
          return null;
        }
      })();

    res.json({ title, description, image, siteName, url: finalUrl });
  } catch {
    res.status(422).json({ error: "Failed to process link preview" });
  }
});

export default router;
