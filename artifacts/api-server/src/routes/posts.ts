import { Router, type IRouter } from "express";
import { Post, User, Notification, Report, type IReaction } from "@workspace/db";
import { requireAuth, optionalAuth, type AuthRequest } from "../lib/auth";
import { uploadBase64 } from "../lib/cloudinary";
import { notifyUserPush } from "../lib/push";
import { buildUserSummary } from "./users";
import { FeedRankingService } from "../services/feedRanking";
import mongoose from "mongoose";

const router: IRouter = Router();

// Helper to compute grouped reactions stats
function computeReactionsSummary(reactionsList?: IReaction[], likesList?: mongoose.Types.ObjectId[], meId?: string) {
  const reactionMap = new Map<string, number>();
  let myReaction: string | null = null;
  const userReactedSet = new Set<string>();

  if (Array.isArray(reactionsList)) {
    for (const r of reactionsList) {
      const emoji = r.emoji || "❤️";
      reactionMap.set(emoji, (reactionMap.get(emoji) ?? 0) + 1);
      const uId = r.userId.toString();
      userReactedSet.add(uId);
      if (meId && uId === meId) {
        myReaction = emoji;
      }
    }
  }

  // Backwards compatibility with legacy likes array
  if (Array.isArray(likesList)) {
    for (const l of likesList) {
      const uId = l.toString();
      if (!userReactedSet.has(uId)) {
        reactionMap.set("❤️", (reactionMap.get("❤️") ?? 0) + 1);
        if (meId && uId === meId && !myReaction) {
          myReaction = "❤️";
        }
      }
    }
  }

  const reactions = Array.from(reactionMap.entries())
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count);

  const topReactions = reactions.slice(0, 3).map((r) => r.emoji);
  const totalCount = reactions.reduce((sum, r) => sum + r.count, 0);

  return {
    likesCount: totalCount,
    reactions,
    topReactions,
    myReaction,
    isLiked: !!myReaction,
  };
}

async function buildPost(post: any, meId?: string) {
  const author = await User.findById(post.authorId);
  const reactionsSummary = computeReactionsSummary(post.reactions, post.likes, meId);

  // Active comments count (excluding soft-deleted ones without active content)
  const activeComments = Array.isArray(post.comments)
    ? post.comments.filter((c: any) => !c.isDeleted || (post.comments.some((sub: any) => sub.parentId?.toString() === c._id.toString() && !sub.isDeleted)))
    : [];

  const topLevelComments = activeComments.filter((c: any) => !c.parentId);
  const recentComments = await Promise.all(
    topLevelComments.slice(-2).map((c: any) => formatCommentItem(c, post.comments || [], meId))
  );

  return {
    id: post._id.toString(),
    caption: post.caption ?? null,
    mediaUrl: post.mediaUrl,
    mediaType: post.mediaType,
    audience: post.audience,
    location: post.location ?? null,
    altText: post.altText ?? null,
    commentsDisabled: post.commentsDisabled,
    additionalMediaUrls: post.additionalMediaUrls ?? [],
    likesCount: reactionsSummary.likesCount,
    reactions: reactionsSummary.reactions,
    topReactions: reactionsSummary.topReactions,
    myReaction: reactionsSummary.myReaction,
    isLiked: reactionsSummary.isLiked,
    isSaved: meId && Array.isArray(post.saves) ? post.saves.some((id: mongoose.Types.ObjectId) => id.toString() === meId) : false,
    commentsCount: activeComments.length,
    comments: recentComments,
    author: await buildUserSummary(author, meId),
    createdAt: post.createdAt ? post.createdAt.toISOString() : new Date().toISOString(),
  };
}

// ── GET /api/posts/feed ──────────────────────────────────────────────────────
router.get("/posts/feed", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "10"), 10)));
  const skip = (page - 1) * limit;

  // 1. Multi-factor candidate generation with privacy and safety filters
  const { candidates, authorMap, followingSet, userInterests } = await FeedRankingService.generateCandidates(
    req.userId,
    100
  );

  // 2. Rank candidates with recency decay, engagement velocity, topic affinity, and diversity spacing
  const rankedItems = FeedRankingService.rankAndDiversify(
    candidates,
    authorMap,
    req.userId,
    followingSet,
    userInterests
  );

  const total = rankedItems.length;
  const paginated = rankedItems.slice(skip, skip + limit);

  const result = await Promise.all(
    paginated.map(async ({ post, recommendationReason }) => {
      const formatted = await buildPost(post, req.userId);
      return {
        ...formatted,
        recommendationReason,
      };
    })
  );

  res.json({
    posts: result,
    hasMore: skip + limit < total,
    total,
    page,
    rankerVersion: FeedRankingService.VERSION,
  });
});

// ── POST /api/feed/signal ───────────────────────────────────────────────────
router.post("/feed/signal", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const { targetId, action, targetType } = req.body as {
    targetId?: string;
    action?: "impression" | "open" | "like" | "save" | "share" | "skip" | "not_interested" | "hide";
    targetType?: "post" | "reel" | "creator";
  };

  if (!targetId || !action) {
    res.status(400).json({ error: "targetId and action required" });
    return;
  }

  // If user marked 'not_interested' or 'hide', store negative signal in user profile
  if (req.userId && (action === "not_interested" || action === "hide")) {
    try {
      const targetPost = await Post.findById(targetId);
      if (targetPost) {
        // Suppress author or hashtags
        if (targetPost.authorId) {
          await User.findByIdAndUpdate(req.userId, {
            $addToSet: { mutedUsers: targetPost.authorId },
          });
        }
      }
    } catch {
      // ignore
    }
  }

  res.json({ ok: true });
});

// ── POST /api/posts ──────────────────────────────────────────────────────────
router.post("/posts", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { caption, mediaUrl, mediaType, audience, location, altText, commentsDisabled, additionalMediaUrls } = req.body;
  if (!mediaUrl) {
    res.status(400).json({ error: "mediaUrl is required" });
    return;
  }
  const post = await Post.create({
    authorId: req.userId,
    caption,
    mediaUrl,
    mediaType: mediaType ?? "image",
    audience: audience ?? "everyone",
    location: location ?? null,
    altText: altText ?? null,
    commentsDisabled: commentsDisabled ?? false,
    additionalMediaUrls: additionalMediaUrls ?? [],
  });
  res.status(201).json(await buildPost(post, req.userId));
});

// ── POST /api/posts/upload ───────────────────────────────────────────────────
router.post("/posts/upload", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { data, mimeType } = req.body as { data?: string; mimeType?: string };
  if (!data || !mimeType) {
    res.status(400).json({ error: "data and mimeType required" });
    return;
  }
  try {
    res.json(await uploadBase64(data, mimeType, "whiterchat/posts"));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Upload failed" });
  }
});

// ── GET /api/posts/:postId ───────────────────────────────────────────────────
router.get("/posts/:postId", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.postId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json(await buildPost(post, req.userId));
});

// ── PATCH /api/posts/:postId ─────────────────────────────────────────────────
router.patch("/posts/:postId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.postId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  if (post.authorId.toString() !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (req.body.caption !== undefined) post.caption = req.body.caption;
  await post.save();
  res.json(await buildPost(post, req.userId));
});

// ── DELETE /api/posts/:postId ────────────────────────────────────────────────
router.delete("/posts/:postId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.postId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  if (post.authorId.toString() !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await post.deleteOne();
  res.sendStatus(204);
});

// ── POST /api/posts/:postId/react (Rich Emoji Reactions) ──────────────────────
router.post("/posts/:postId/react", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.postId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const { emoji } = req.body as { emoji?: string };
  const targetEmoji = (emoji && emoji.trim()) || "❤️";
  const meObjectId = new mongoose.Types.ObjectId(req.userId!);

  if (!post.reactions) post.reactions = [];
  if (!post.likes) post.likes = [];

  const existingReactionIdx = post.reactions.findIndex(
    (r: any) => r.userId.toString() === req.userId
  );
  const existingLikeIdx = post.likes.findIndex(
    (id: mongoose.Types.ObjectId) => id.toString() === req.userId
  );

  let newReactionState: string | null = null;

  if (existingReactionIdx >= 0) {
    const currentEmoji = post.reactions[existingReactionIdx].emoji;
    if (currentEmoji === targetEmoji) {
      // Toggle off (remove reaction)
      post.reactions.splice(existingReactionIdx, 1);
      if (existingLikeIdx >= 0) post.likes.splice(existingLikeIdx, 1);
      newReactionState = null;
    } else {
      // Change reaction emoji
      post.reactions[existingReactionIdx].emoji = targetEmoji;
      post.reactions[existingReactionIdx].createdAt = new Date();
      newReactionState = targetEmoji;
    }
  } else if (existingLikeIdx >= 0) {
    // Migrating from legacy like
    if (targetEmoji === "❤️") {
      // User tapped like again to remove
      post.likes.splice(existingLikeIdx, 1);
      newReactionState = null;
    } else {
      // Add explicit reaction
      post.reactions.push({
        userId: meObjectId,
        emoji: targetEmoji,
        createdAt: new Date(),
      } as any);
      newReactionState = targetEmoji;
    }
  } else {
    // New reaction
    post.reactions.push({
      userId: meObjectId,
      emoji: targetEmoji,
      createdAt: new Date(),
    } as any);
    post.likes.push(meObjectId);
    newReactionState = targetEmoji;

    // Send notification to post author if not self
    if (post.authorId.toString() !== req.userId) {
      await Notification.create({
        userId: post.authorId,
        actorId: req.userId,
        type: "post_reaction",
        postId: post._id,
        reactionEmoji: targetEmoji,
      });
      notifyUserPush(post.authorId.toString(), req.userId!, "like").catch(() => {});
    }
  }

  await post.save();

  const summary = computeReactionsSummary(post.reactions, post.likes, req.userId);

  const io = req.app.get("io");
  if (io) {
    io.emit("post_reaction_updated", {
      postId: post._id.toString(),
      reactions: summary.reactions,
      topReactions: summary.topReactions,
      likesCount: summary.likesCount,
    });
  }

  res.json({
    success: true,
    isLiked: summary.isLiked,
    myReaction: summary.myReaction,
    likesCount: summary.likesCount,
    reactions: summary.reactions,
    topReactions: summary.topReactions,
  });
});

// ── POST /api/posts/:postId/like (Legacy alias for ❤️ react) ──────────────────
router.post("/posts/:postId/like", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.postId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const meId = new mongoose.Types.ObjectId(req.userId!);
  if (!post.reactions) post.reactions = [];
  if (!post.likes) post.likes = [];

  const existingReactionIdx = post.reactions.findIndex((r: any) => r.userId.toString() === req.userId);
  const existingLikeIdx = post.likes.findIndex((id: mongoose.Types.ObjectId) => id.toString() === req.userId);

  let isLikedNow = false;

  if (existingReactionIdx >= 0 || existingLikeIdx >= 0) {
    // Remove both
    if (existingReactionIdx >= 0) post.reactions.splice(existingReactionIdx, 1);
    if (existingLikeIdx >= 0) post.likes.splice(existingLikeIdx, 1);
    isLikedNow = false;
  } else {
    // Add heart reaction
    post.reactions.push({ userId: meId, emoji: "❤️", createdAt: new Date() } as any);
    post.likes.push(meId);
    isLikedNow = true;

    if (post.authorId.toString() !== req.userId) {
      await Notification.create({
        userId: post.authorId,
        actorId: req.userId,
        type: "like",
        postId: post._id,
      });
      notifyUserPush(post.authorId.toString(), req.userId!, "like").catch(() => {});
    }
  }

  await post.save();
  const summary = computeReactionsSummary(post.reactions, post.likes, req.userId);

  const io = req.app.get("io");
  if (io) {
    io.emit("post_reaction_updated", {
      postId: post._id.toString(),
      reactions: summary.reactions,
      topReactions: summary.topReactions,
      likesCount: summary.likesCount,
    });
  }

  res.json({
    isLiked: isLikedNow,
    likesCount: summary.likesCount,
    myReaction: summary.myReaction,
    reactions: summary.reactions,
    topReactions: summary.topReactions,
  });
});

// ── GET /api/posts/:postId/reactions (List users who reacted) ────────────────
router.get("/posts/:postId/reactions", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.postId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const { emoji } = req.query as { emoji?: string };
  const allReactions: { userId: string; emoji: string; createdAt: Date }[] = [];

  const seenUsers = new Set<string>();

  if (Array.isArray(post.reactions)) {
    for (const r of post.reactions) {
      const uId = r.userId.toString();
      seenUsers.add(uId);
      if (!emoji || r.emoji === emoji) {
        allReactions.push({ userId: uId, emoji: r.emoji || "❤️", createdAt: r.createdAt || post.createdAt });
      }
    }
  }

  if (Array.isArray(post.likes)) {
    for (const l of post.likes) {
      const uId = l.toString();
      if (!seenUsers.has(uId)) {
        if (!emoji || emoji === "❤️") {
          allReactions.push({ userId: uId, emoji: "❤️", createdAt: post.createdAt });
        }
      }
    }
  }

  const userIds = allReactions.map((r) => new mongoose.Types.ObjectId(r.userId));
  const users = await User.find({ _id: { $in: userIds } });
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const data = await Promise.all(
    allReactions.map(async (r) => {
      const u = userMap.get(r.userId);
      return {
        user: await buildUserSummary(u, req.userId),
        emoji: r.emoji,
        createdAt: r.createdAt.toISOString(),
      };
    })
  );

  res.json({
    reactions: data,
    summary: computeReactionsSummary(post.reactions, post.likes, req.userId),
  });
});

// ── POST /api/posts/:postId/save ─────────────────────────────────────────────
router.post("/posts/:postId/save", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.postId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const meId = new mongoose.Types.ObjectId(req.userId!);
  const isSaved = post.saves.some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
  if (isSaved) {
    await Post.findByIdAndUpdate(post._id, { $pull: { saves: meId } });
    res.json({ isSaved: false });
  } else {
    await Post.findByIdAndUpdate(post._id, { $addToSet: { saves: meId } });
    res.json({ isSaved: true });
  }
});

// Helper to format comment
async function formatCommentItem(comment: any, allComments: any[], meId?: string): Promise<unknown> {
  const author = await User.findById(comment.authorId);
  const replies = allComments.filter((c: any) => c.parentId?.toString() === comment._id.toString());
  const summary = computeReactionsSummary(comment.reactions, comment.likes, meId);

  return {
    id: comment._id.toString(),
    text: comment.isDeleted ? "[Comment deleted]" : comment.text ?? "",
    author: await buildUserSummary(author, meId),
    parentId: comment.parentId?.toString() ?? null,
    mediaType: comment.isDeleted ? null : comment.mediaType ?? null,
    mediaUrl: comment.isDeleted ? null : comment.mediaUrl ?? null,
    voiceDuration: comment.isDeleted ? null : comment.voiceDuration ?? null,
    likesCount: summary.likesCount,
    isLiked: summary.isLiked,
    myReaction: summary.myReaction,
    reactions: summary.reactions,
    topReactions: summary.topReactions,
    isEdited: !!comment.isEdited,
    isDeleted: !!comment.isDeleted,
    mentions: comment.mentions ?? [],
    repliesCount: replies.length,
    replies: await Promise.all(replies.map((r: any) => formatCommentItem(r, allComments, meId))),
    createdAt: comment.createdAt ? comment.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: comment.updatedAt ? comment.updatedAt.toISOString() : null,
  };
}

// ── GET /api/posts/:postId/comments ──────────────────────────────────────────
router.get("/posts/:postId/comments", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.postId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "15"), 10)));
  const skip = (page - 1) * limit;

  const allComments = post.comments || [];
  const topLevel = allComments.filter((c: any) => !c.parentId);
  const totalTopLevel = topLevel.length;
  const paginatedTopLevel = topLevel.slice(skip, skip + limit);

  const formatted = await Promise.all(paginatedTopLevel.map((c: any) => formatCommentItem(c, allComments, req.userId)));
  res.json({
    comments: formatted,
    hasMore: skip + limit < totalTopLevel,
    total: totalTopLevel,
    page,
  });
});

// ── POST /api/posts/:postId/comments (Rich Composer: Text, Media, GIF, Voice) ─
router.post("/posts/:postId/comments", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.postId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  if (post.commentsDisabled) {
    res.status(403).json({ error: "Comments are disabled for this post" });
    return;
  }

  // Enforce post author's whoCanComment privacy settings
  const postAuthor = await User.findById(post.authorId);
  if (postAuthor && post.authorId.toString() !== req.userId) {
    const whoCanComment = postAuthor.privacySettings?.whoCanComment || "everyone";
    if (whoCanComment === "none" || whoCanComment === "no_one") {
      res.status(403).json({ error: "This user does not allow comments on their posts" });
      return;
    }
    if (whoCanComment === "following") {
      const authorFollowsMe = (postAuthor.following ?? []).some(
        (id: mongoose.Types.ObjectId) => id.toString() === req.userId
      );
      if (!authorFollowsMe) {
        res.status(403).json({ error: "Only accounts followed by this user can comment on their posts" });
        return;
      }
    }
  }

  const { text, parentId, mediaType, mediaUrl, voiceDuration } = req.body as {

    text?: string;
    parentId?: string;
    mediaType?: "image" | "gif" | "sticker" | "voice";
    mediaUrl?: string;
    voiceDuration?: number;
  };

  const cleanText = text?.trim() || "";

  if (!cleanText && !mediaUrl) {
    res.status(400).json({ error: "Text or media is required" });
    return;
  }

  // Extract @mentions from text
  const mentionMatches = cleanText.match(/@([a-zA-Z0-9_\.]+)/g);
  const mentions = mentionMatches ? Array.from(new Set(mentionMatches.map((m) => m.slice(1)))) : [];

  const comment = {
    _id: new mongoose.Types.ObjectId(),
    authorId: new mongoose.Types.ObjectId(req.userId!),
    text: cleanText,
    parentId: parentId ? new mongoose.Types.ObjectId(parentId) : undefined,
    mediaType: mediaType || null,
    mediaUrl: mediaUrl || null,
    voiceDuration: voiceDuration || null,
    likes: [],
    reactions: [],
    isEdited: false,
    isDeleted: false,
    mentions,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  post.comments.push(comment as any);
  await post.save();

  // Find parent comment for reply notification
  let parentComment: any = null;
  if (parentId) {
    parentComment = post.comments.find((c: any) => c._id.toString() === parentId);
  }

  // 1. Notify parent comment author if replying
  if (parentComment && parentComment.authorId.toString() !== req.userId) {
    await Notification.create({
      userId: parentComment.authorId,
      actorId: req.userId,
      type: "comment_reply",
      postId: post._id,
      commentId: comment._id,
      commentText: cleanText || (mediaType ? `[${mediaType}]` : "Reply"),
      mediaType: mediaType || undefined,
    });
    notifyUserPush(parentComment.authorId.toString(), req.userId!, "comment", {
      commentText: cleanText || `Sent a ${mediaType || "reply"}`,
    }).catch(() => {});
  }

  // 2. Notify post author if not self and not already parent author
  if (post.authorId.toString() !== req.userId && (!parentComment || parentComment.authorId.toString() !== post.authorId.toString())) {
    await Notification.create({
      userId: post.authorId,
      actorId: req.userId,
      type: "comment",
      postId: post._id,
      commentId: comment._id,
      commentText: cleanText || (mediaType ? `[${mediaType}]` : "Comment"),
      mediaType: mediaType || undefined,
    });
    notifyUserPush(post.authorId.toString(), req.userId!, "comment", {
      commentText: cleanText || `Sent a ${mediaType || "comment"}`,
    }).catch(() => {});
  }

  // 3. Notify mentioned users
  if (mentions.length > 0) {
    const mentionedUsers = await User.find({ username: { $in: mentions } }).select("_id");
    for (const u of mentionedUsers) {
      if (u._id.toString() !== req.userId && u._id.toString() !== post.authorId.toString()) {
        await Notification.create({
          userId: u._id,
          actorId: req.userId,
          type: "mention",
          postId: post._id,
          commentId: comment._id,
          commentText: cleanText,
        }).catch(() => {});
      }
    }
  }

  const payload = await formatCommentItem(comment, post.comments, req.userId);

  const io = req.app.get("io");
  if (io) {
    io.to(`post:${post._id}`).emit("new_comment", {
      postId: post._id.toString(),
      comment: payload,
    });
  }

  res.status(201).json(payload);
});

// ── PATCH /api/comments/:commentId (Edit comment text) ────────────────────────
router.patch("/comments/:commentId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const commentId = req.params.commentId;
  const { text } = req.body as { text?: string };

  if (typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const post = await Post.findOne({ "comments._id": new mongoose.Types.ObjectId(commentId) }).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  const comment = post.comments.find((c: any) => c._id.toString() === commentId);
  if (!comment) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  if (comment.authorId.toString() !== req.userId) {
    res.status(403).json({ error: "Forbidden: Only author can edit" });
    return;
  }

  if (comment.isDeleted) {
    res.status(400).json({ error: "Cannot edit a deleted comment" });
    return;
  }

  const cleanText = text.trim();
  const mentionMatches = cleanText.match(/@([a-zA-Z0-9_\.]+)/g);
  const mentions = mentionMatches ? Array.from(new Set(mentionMatches.map((m) => m.slice(1)))) : [];

  comment.text = cleanText;
  comment.isEdited = true;
  comment.mentions = mentions;
  comment.updatedAt = new Date();

  await post.save();

  const payload = await formatCommentItem(comment, post.comments, req.userId);

  const io = req.app.get("io");
  if (io) {
    io.to(`post:${post._id}`).emit("edit_comment", {
      postId: post._id.toString(),
      comment: payload,
    });
  }

  res.json(payload);
});

// ── DELETE /api/comments/:commentId ──────────────────────────────────────────
router.delete("/comments/:commentId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const commentId = req.params.commentId;
  const post = await Post.findOne({ "comments._id": new mongoose.Types.ObjectId(commentId) }).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  const comment = post.comments.find((c: any) => c._id.toString() === commentId);
  if (!comment) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  const isAuthor = comment.authorId.toString() === req.userId;
  const isPostOwner = post.authorId.toString() === req.userId;

  if (!isAuthor && !isPostOwner) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Check if comment has child replies
  const hasReplies = post.comments.some((c: any) => c.parentId?.toString() === commentId);

  if (hasReplies) {
    // Soft delete to preserve nested thread hierarchy
    comment.isDeleted = true;
    comment.text = "[Comment deleted]";
    comment.mediaUrl = null;
    comment.mediaType = null;
    comment.voiceDuration = null;
    await post.save();
  } else {
    // Hard delete
    await Post.findByIdAndUpdate(post._id, {
      $pull: { comments: { _id: comment._id } },
    });
  }

  const io = req.app.get("io");
  if (io) {
    io.to(`post:${post._id}`).emit("delete_comment", {
      postId: post._id.toString(),
      commentId,
      softDeleted: hasReplies,
    });
  }

  res.status(200).json({ success: true, softDeleted: hasReplies });
});

// ── POST /api/comments/:commentId/react (Emoji Reaction on Comment) ──────────
router.post("/comments/:commentId/react", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const commentId = req.params.commentId;
  const { emoji } = req.body as { emoji?: string };
  const targetEmoji = (emoji && emoji.trim()) || "❤️";
  const meObjectId = new mongoose.Types.ObjectId(req.userId!);

  const post = await Post.findOne({ "comments._id": new mongoose.Types.ObjectId(commentId) }).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  const comment = post.comments.find((c: any) => c._id.toString() === commentId) as any;
  if (!comment || comment.isDeleted) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  if (!comment.reactions) comment.reactions = [];
  if (!comment.likes) comment.likes = [];

  const existingReactionIdx = comment.reactions.findIndex(
    (r: any) => r.userId.toString() === req.userId
  );
  const existingLikeIdx = comment.likes.findIndex(
    (id: mongoose.Types.ObjectId) => id.toString() === req.userId
  );

  let newReactionState: string | null = null;

  if (existingReactionIdx >= 0) {
    const currentEmoji = comment.reactions[existingReactionIdx].emoji;
    if (currentEmoji === targetEmoji) {
      // Toggle off
      comment.reactions.splice(existingReactionIdx, 1);
      if (existingLikeIdx >= 0) comment.likes.splice(existingLikeIdx, 1);
      newReactionState = null;
    } else {
      // Change emoji
      comment.reactions[existingReactionIdx].emoji = targetEmoji;
      comment.reactions[existingReactionIdx].createdAt = new Date();
      newReactionState = targetEmoji;
    }
  } else if (existingLikeIdx >= 0) {
    if (targetEmoji === "❤️") {
      comment.likes.splice(existingLikeIdx, 1);
      newReactionState = null;
    } else {
      comment.reactions.push({
        userId: meObjectId,
        emoji: targetEmoji,
        createdAt: new Date(),
      } as any);
      newReactionState = targetEmoji;
    }
  } else {
    // New reaction
    comment.reactions.push({
      userId: meObjectId,
      emoji: targetEmoji,
      createdAt: new Date(),
    } as any);
    comment.likes.push(meObjectId);
    newReactionState = targetEmoji;

    if (comment.authorId.toString() !== req.userId) {
      await Notification.create({
        userId: comment.authorId,
        actorId: req.userId,
        type: "comment_reaction",
        postId: post._id,
        commentId: comment._id,
        reactionEmoji: targetEmoji,
        commentText: comment.text,
      });
    }
  }

  await post.save();

  const summary = computeReactionsSummary(comment.reactions, comment.likes, req.userId);

  const io = req.app.get("io");
  if (io) {
    io.to(`post:${post._id}`).emit("comment_reaction_updated", {
      postId: post._id.toString(),
      commentId,
      reactions: summary.reactions,
      topReactions: summary.topReactions,
      likesCount: summary.likesCount,
    });
  }

  res.json({
    success: true,
    isLiked: summary.isLiked,
    myReaction: summary.myReaction,
    likesCount: summary.likesCount,
    reactions: summary.reactions,
    topReactions: summary.topReactions,
  });
});

// ── GET /api/comments/:commentId/reactions ───────────────────────────────────
router.get("/comments/:commentId/reactions", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const commentId = req.params.commentId;
  const post = await Post.findOne({ "comments._id": new mongoose.Types.ObjectId(commentId) }).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  const comment = post.comments.find((c: any) => c._id.toString() === commentId) as any;
  if (!comment) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  const { emoji } = req.query as { emoji?: string };
  const allReactions: { userId: string; emoji: string; createdAt: Date }[] = [];
  const seenUsers = new Set<string>();

  if (Array.isArray(comment.reactions)) {
    for (const r of comment.reactions) {
      const uId = r.userId.toString();
      seenUsers.add(uId);
      if (!emoji || r.emoji === emoji) {
        allReactions.push({ userId: uId, emoji: r.emoji || "❤️", createdAt: r.createdAt || comment.createdAt });
      }
    }
  }

  if (Array.isArray(comment.likes)) {
    for (const l of comment.likes) {
      const uId = l.toString();
      if (!seenUsers.has(uId)) {
        if (!emoji || emoji === "❤️") {
          allReactions.push({ userId: uId, emoji: "❤️", createdAt: comment.createdAt });
        }
      }
    }
  }

  const userIds = allReactions.map((r) => new mongoose.Types.ObjectId(r.userId));
  const users = await User.find({ _id: { $in: userIds } });
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const data = await Promise.all(
    allReactions.map(async (r) => {
      const u = userMap.get(r.userId);
      return {
        user: await buildUserSummary(u, req.userId),
        emoji: r.emoji,
        createdAt: r.createdAt.toISOString(),
      };
    })
  );

  res.json({
    reactions: data,
    summary: computeReactionsSummary(comment.reactions, comment.likes, req.userId),
  });
});

// ── GET /api/users/mention-search (Autocomplete helper for @mentions) ─────────
router.get("/users/mention-search", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const query = String(req.query.q ?? "").trim();
  if (!query) {
    res.json({ users: [] });
    return;
  }

  const users = await User.find({
    $or: [
      { username: { $regex: query, $options: "i" } },
      { fullName: { $regex: query, $options: "i" } },
    ],
  })
    .limit(8)
    .select("username fullName avatarUrl isVerified");

  const results = users.map((u) => ({
    id: u._id.toString(),
    username: u.username,
    fullName: u.fullName,
    avatarUrl: u.avatarUrl,
    isVerified: (u as any).isVerified ?? false,
  }));

  res.json({ users: results });
});

export default router;

