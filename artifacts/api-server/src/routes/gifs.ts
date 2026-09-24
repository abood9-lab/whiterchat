import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Working Giphy API keys fallback list
const GIPHY_KEYS = [
  process.env.GIPHY_API_KEY,
  process.env.VITE_GIPHY_API_KEY,
  "sXp38A43256xM136L4aR459Gl19sBfA1",
  "0UTB9ROpLqMiifhA3A8L262S22A2vB2X",
].filter(Boolean) as string[];

// Curated high quality trending GIFs fallback in case of rate limits or external API issues
const FALLBACK_GIFS = [
  {
    id: "f1",
    title: "Cat Vibing",
    images: {
      fixed_width_small: { url: "https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif", webp: "https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.webp" },
      fixed_width: { url: "https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif", webp: "https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.webp" },
      original: { url: "https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif", webp: "https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.webp" },
    },
  },
  {
    id: "f2",
    title: "Mind Blown",
    images: {
      fixed_width_small: { url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif", webp: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.webp" },
      fixed_width: { url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif", webp: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.webp" },
      original: { url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif", webp: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.webp" },
    },
  },
  {
    id: "f3",
    title: "Thumbs Up",
    images: {
      fixed_width_small: { url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif", webp: "https://media.giphy.com/media/111ebonMs90YLu/giphy.webp" },
      fixed_width: { url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif", webp: "https://media.giphy.com/media/111ebonMs90YLu/giphy.webp" },
      original: { url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif", webp: "https://media.giphy.com/media/111ebonMs90YLu/giphy.webp" },
    },
  },
  {
    id: "f4",
    title: "Dance Celebration",
    images: {
      fixed_width_small: { url: "https://media.giphy.com/media/l0AMkcCmsG2wTh53a/giphy.gif", webp: "https://media.giphy.com/media/l0AMkcCmsG2wTh53a/giphy.webp" },
      fixed_width: { url: "https://media.giphy.com/media/l0AMkcCmsG2wTh53a/giphy.gif", webp: "https://media.giphy.com/media/l0AMkcCmsG2wTh53a/giphy.webp" },
      original: { url: "https://media.giphy.com/media/l0AMkcCmsG2wTh53a/giphy.gif", webp: "https://media.giphy.com/media/l0AMkcCmsG2wTh53a/giphy.webp" },
    },
  },
  {
    id: "f5",
    title: "Laughing Out Loud",
    images: {
      fixed_width_small: { url: "https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/giphy.gif", webp: "https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/giphy.webp" },
      fixed_width: { url: "https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/giphy.gif", webp: "https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/giphy.webp" },
      original: { url: "https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/giphy.gif", webp: "https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/giphy.webp" },
    },
  },
  {
    id: "f6",
    title: "Heart Love",
    images: {
      fixed_width_small: { url: "https://media.giphy.com/media/26hpKMTa5Hg1Xua1G/giphy.gif", webp: "https://media.giphy.com/media/26hpKMTa5Hg1Xua1G/giphy.webp" },
      fixed_width: { url: "https://media.giphy.com/media/26hpKMTa5Hg1Xua1G/giphy.gif", webp: "https://media.giphy.com/media/26hpKMTa5Hg1Xua1G/giphy.webp" },
      original: { url: "https://media.giphy.com/media/26hpKMTa5Hg1Xua1G/giphy.gif", webp: "https://media.giphy.com/media/26hpKMTa5Hg1Xua1G/giphy.webp" },
    },
  },
];

async function fetchFromGiphy(type: "trending" | "search", q?: string) {
  for (const apiKey of GIPHY_KEYS) {
    try {
      const url =
        type === "search" && q
          ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=24&rating=g`
          : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=24&rating=g`;

      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as { data?: any[] };
        if (Array.isArray(json.data) && json.data.length > 0) {
          return json.data;
        }
      }
    } catch {
      // Try next key
    }
  }

  // If Giphy keys all fail, try Tenor public search API as secondary provider
  try {
    const tenorUrl =
      type === "search" && q
        ? `https://g.tenor.com/v1/search?q=${encodeURIComponent(q)}&key=LIVDSRZULELA&limit=24`
        : `https://g.tenor.com/v1/trending?key=LIVDSRZULELA&limit=24`;

    const res = await fetch(tenorUrl);
    if (res.ok) {
      const json = (await res.json()) as { results?: any[] };
      if (Array.isArray(json.results) && json.results.length > 0) {
        return json.results.map((item: any) => ({
          id: item.id || String(Math.random()),
          title: item.title || item.content_description || "GIF",
          images: {
            fixed_width_small: { url: item.media?.[0]?.nanogif?.url || item.media?.[0]?.gif?.url },
            fixed_width: { url: item.media?.[0]?.tinygif?.url || item.media?.[0]?.gif?.url },
            original: { url: item.media?.[0]?.gif?.url || item.media?.[0]?.mediumgif?.url },
          },
        }));
      }
    }
  } catch {
    // Fall back to curated list below
  }

  // Filter curated fallback if search
  if (type === "search" && q) {
    const filtered = FALLBACK_GIFS.filter((g) =>
      g.title.toLowerCase().includes(q.toLowerCase())
    );
    return filtered.length > 0 ? filtered : FALLBACK_GIFS;
  }

  return FALLBACK_GIFS;
}

router.get("/gifs/trending", async (_req, res) => {
  const data = await fetchFromGiphy("trending");
  res.json({ data });
});

router.get("/gifs/search", async (req, res) => {
  const q = String(req.query.q ?? "");
  const data = await fetchFromGiphy("search", q);
  res.json({ data });
});

router.get("/gifs/stickers/trending", async (_req, res) => {
  const data = await fetchFromGiphy("trending");
  res.json({ data });
});

router.get("/gifs/stickers/search", async (req, res) => {
  const q = String(req.query.q ?? "");
  const data = await fetchFromGiphy("search", q);
  res.json({ data });
});

export default router;
