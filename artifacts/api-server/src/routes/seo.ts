import { Router, type IRouter } from "express";
import { SeoService } from "../services/seoService";
import { User, Post } from "@workspace/db";
import { optionalAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

// ── GET /sitemap.xml ────────────────────────────────────────────────────────
router.get("/sitemap.xml", async (req, res): Promise<void> => {
  try {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    const sitemapXml = await SeoService.generateSitemap(baseUrl);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.status(200).send(sitemapXml);
  } catch (err: any) {
    res.status(500).send(`<!-- Error generating sitemap: ${err.message} -->`);
  }
});

// ── GET /robots.txt ─────────────────────────────────────────────────────────
router.get("/robots.txt", (req, res): void => {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost:3000";
  const baseUrl = `${protocol}://${host}`;

  const robots = SeoService.generateRobotsTxt(baseUrl);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.status(200).send(robots);
});

// ── GET /api/seo/metadata ───────────────────────────────────────────────────
router.get("/seo/metadata", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const path = String(req.query.path || "/");
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost:3000";
  const baseUrl = `${protocol}://${host}`;

  // 1. Profile Page Metadata (/profile/:username)
  const profileMatch = path.match(/^\/profile\/([a-zA-Z0-9._]+)/);
  if (profileMatch) {
    const username = profileMatch[1];
    const user = await User.findOne({ username });
    if (user && !user.isDeactivated) {
      const meta = SeoService.buildProfileMetadata(user, baseUrl);
      res.json(meta);
      return;
    }
  }

  // 2. Post / Reel Detail Page Metadata (/post/:id or /reel/:id)
  const contentMatch = path.match(/^\/(post|reel)\/([a-fA-F0-9]{24})/);
  if (contentMatch) {
    const type = contentMatch[1];
    const id = contentMatch[2];
    const post = await Post.findById(id);
    if (post) {
      const author = await User.findById(post.authorId);
      if (type === "reel" || post.isReel || post.mediaType === "video") {
        const meta = SeoService.buildReelMetadata(post, author, baseUrl);
        res.json(meta);
        return;
      } else {
        const meta = SeoService.buildPostMetadata(post, author, baseUrl);
        res.json(meta);
        return;
      }
    }
  }

  // 3. Static Public Pages
  if (path === "/explore") {
    res.json({
      title: `Explore Trending Photos, Creators & Ideas – ${SeoService.SITE_NAME}`,
      description: "Discover viral photos, popular creators, trending hashtags, and creative topics from around the world.",
      canonicalUrl: `${baseUrl}/explore`,
      ogType: "website",
      ogImage: SeoService.DEFAULT_IMAGE,
      twitterCard: "summary_large_image",
      noIndex: false,
    });
    return;
  }

  if (path === "/reels") {
    res.json({
      title: `Watch Trending Reels & Short Videos – ${SeoService.SITE_NAME}`,
      description: "Watch and share immersive short videos, viral clips, original audio tracks, and daily entertainment.",
      canonicalUrl: `${baseUrl}/reels`,
      ogType: "website",
      ogImage: SeoService.DEFAULT_IMAGE,
      twitterCard: "summary_large_image",
      noIndex: false,
    });
    return;
  }

  if (path === "/about") {
    res.json({
      title: `About ${SeoService.SITE_NAME} – Authentic Social Connection`,
      description: `${SeoService.SITE_NAME} empowers creators and communities to connect with transparency, privacy, and rich visual expression.`,
      canonicalUrl: `${baseUrl}/about`,
      ogType: "website",
      ogImage: SeoService.DEFAULT_IMAGE,
      twitterCard: "summary",
      noIndex: false,
    });
    return;
  }

  // Default Home
  res.json({
    title: SeoService.DEFAULT_TITLE,
    description: SeoService.DEFAULT_DESC,
    canonicalUrl: baseUrl,
    ogType: "website",
    ogImage: SeoService.DEFAULT_IMAGE,
    twitterCard: "summary_large_image",
    noIndex: false,
  });
});

export default router;
