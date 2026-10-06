import { Router, type IRouter } from "express";
import { Post, User } from "@workspace/db";
import { optionalAuth, requireAuth, type AuthRequest } from "../lib/auth";
import { buildUserSummary } from "./users";
import { SearchRankingService } from "../services/searchService";
import mongoose from "mongoose";

const router: IRouter = Router();

router.get("/explore/posts", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const limit = parseInt(String(req.query.limit ?? "20"), 10);
  const skip = (page - 1) * limit;
  const [posts, total] = await Promise.all([
    Post.find({ audience: "everyone" }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Post.countDocuments({ audience: "everyone" }),
  ]);
  const result = await Promise.all(
    posts.map(async (post) => {
      const author = await User.findById(post.authorId);
      return {
        id: post._id.toString(),
        caption: post.caption ?? null,
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType,
        likesCount: post.likes.length,
        commentsCount: post.comments?.filter((c) => !c.isDeleted)?.length || 0,
        isLiked: req.userId ? post.likes.some((id: mongoose.Types.ObjectId) => id.toString() === req.userId) : false,
        isSaved: req.userId ? post.saves.some((id: mongoose.Types.ObjectId) => id.toString() === req.userId) : false,
        author: await buildUserSummary(author, req.userId),
        createdAt: post.createdAt.toISOString(),
      };
    })
  );
  res.json({ posts: result, hasMore: skip + limit < total, total });
});

// ── GET /api/search/autocomplete ──────────────────────────────────────────
router.get("/search/autocomplete", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const q = String(req.query.q ?? "");
  const results = await SearchRankingService.autocomplete(q, req.userId);
  res.json(results);
});

// ── GET /api/search/unified ────────────────────────────────────────────────
router.get("/search/unified", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const q = String(req.query.q ?? "");
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
  const results = await SearchRankingService.searchAll(q, req.userId, limit);

  // Save to user search history if authenticated
  if (req.userId && q.trim().length > 1) {
    try {
      await User.findByIdAndUpdate(req.userId, {
        $pull: { searchHistory: { query: q.trim() } },
      });
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          searchHistory: {
            $each: [{ query: q.trim(), timestamp: new Date() }],
            $slice: -20,
          },
        },
      });
    } catch {
      // ignore
    }
  }

  res.json(results);
});

// ── GET /api/search/users ──────────────────────────────────────────────────
router.get("/search/users", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const q = String(req.query.q ?? "");
  const limit = parseInt(String(req.query.limit ?? "10"), 10);
  if (!q) {
    res.json([]);
    return;
  }
  const results = await SearchRankingService.searchAll(q, req.userId, limit);
  res.json(results.users);
});

// ── GET /api/search/history ────────────────────────────────────────────────
router.get("/search/history", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId).select("searchHistory");
  const history = (user?.searchHistory || []).map((h) => ({
    query: h.query,
    timestamp: h.timestamp ? new Date(h.timestamp).toISOString() : new Date().toISOString(),
  }));
  res.json(history.reverse());
});

// ── DELETE /api/search/history ─────────────────────────────────────────────
router.delete("/search/history", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  await User.findByIdAndUpdate(req.userId, { $set: { searchHistory: [] } });
  res.json({ ok: true, message: "Search history cleared" });
});

// ── DELETE /api/search/history/:query ──────────────────────────────────────
router.delete("/search/history/:query", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const queryToDelete = decodeURIComponent(req.params.query);
  await User.findByIdAndUpdate(req.userId, {
    $pull: { searchHistory: { query: queryToDelete } },
  });
  res.json({ ok: true });
});

export default router;
