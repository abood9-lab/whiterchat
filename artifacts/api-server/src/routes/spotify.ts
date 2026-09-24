import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Cache for Spotify access token if configured
let spotifyTokenCache: { token: string; expiresAt: number } | null = null;

async function getSpotifyAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (spotifyTokenCache && Date.now() < spotifyTokenCache.expiresAt) {
    return spotifyTokenCache.token;
  }

  try {
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (data.access_token) {
      spotifyTokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000 - 60000,
      };
      return data.access_token;
    }
  } catch {
    // Return null on failure
  }
  return null;
}

// Fallback high-quality track list for initial view
const FEATURED_TRACKS = [
  {
    trackId: "spot_1",
    title: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    coverUrl: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=300&fit=crop",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioVideo125/v4/bf/ce/d5/bfced52e-5f33-c15d-531e-4581534b8c0a/mzaf_16409745749712613146.plus.aac.p.m4a",
    spotifyUrl: "https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b",
  },
  {
    trackId: "spot_2",
    title: "As It Was",
    artist: "Harry Styles",
    album: "Harry's House",
    coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioVideo112/v4/4b/22/0c/4b220c1a-fbef-91a5-3a05-1815e982ec45/mzaf_10795593026338573215.plus.aac.p.m4a",
    spotifyUrl: "https://open.spotify.com/track/4D8txjvhx4n3sM61fL8G6u",
  },
  {
    trackId: "spot_3",
    title: "Starboy",
    artist: "The Weeknd ft. Daft Punk",
    album: "Starboy",
    coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioVideo115/v4/db/4f/2e/db4f2e96-a83e-1051-50e5-163f58757c91/mzaf_13501726053331904791.plus.aac.p.m4a",
    spotifyUrl: "https://open.spotify.com/track/7MXVkkvMVF4ScHYRJuKdft",
  },
  {
    trackId: "spot_4",
    title: "Levitating",
    artist: "Dua Lipa",
    album: "Future Nostalgia",
    coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioVideo122/v4/4a/12/be/4a12be40-7e61-7bf1-d57c-87d2a5a54db3/mzaf_17849156407981248474.plus.aac.p.m4a",
    spotifyUrl: "https://open.spotify.com/track/46spSGviWVPh9FRKB2yviJ",
  },
];

router.get("/spotify/search", async (req, res) => {
  const query = String(req.query.q ?? "").trim();
  if (!query) {
    res.json({ tracks: FEATURED_TRACKS });
    return;
  }

  // 1. Try Spotify Web API if token available
  const token = await getSpotifyAccessToken();
  if (token) {
    try {
      const spotifyRes = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=15`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (spotifyRes.ok) {
        const data = (await spotifyRes.json()) as { tracks?: { items?: any[] } };
        if (data.tracks?.items && data.tracks.items.length > 0) {
          const tracks = data.tracks.items.map((item: any) => ({
            trackId: item.id,
            title: item.name,
            artist: item.artists?.map((a: any) => a.name).join(", ") || "Unknown Artist",
            album: item.album?.name || "",
            coverUrl: item.album?.images?.[0]?.url || item.album?.images?.[1]?.url || "",
            previewUrl: item.preview_url || null,
            spotifyUrl: item.external_urls?.spotify || `https://open.spotify.com/track/${item.id}`,
          }));
          res.json({ tracks });
          return;
        }
      }
    } catch {
      // Fall through to public metadata provider
    }
  }

  // 2. Public track metadata provider (iTunes Search API for legal previews and artwork)
  try {
    const itunesRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=15`
    );
    if (itunesRes.ok) {
      const data = (await itunesRes.json()) as { results?: any[] };
      if (data.results && data.results.length > 0) {
        const tracks = data.results.map((item: any) => ({
          trackId: `itunes_${item.trackId}`,
          title: item.trackName,
          artist: item.artistName,
          album: item.collectionName || "",
          coverUrl: (item.artworkUrl100 || item.artworkUrl60 || "").replace("100x100bb", "300x300bb"),
          previewUrl: item.previewUrl || null,
          spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(item.trackName + " " + item.artistName)}`,
        }));
        res.json({ tracks });
        return;
      }
    }
  } catch {
    // Fall back to filtered featured tracks
  }

  const filtered = FEATURED_TRACKS.filter(
    (t) =>
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      t.artist.toLowerCase().includes(query.toLowerCase())
  );
  res.json({ tracks: filtered.length > 0 ? filtered : FEATURED_TRACKS });
});

export default router;
