import { Router, type IRouter } from "express";
import { Post, User, Notification, Report, Message, Conversation, type IReaction } from "@workspace/db";
import { requireAuth, optionalAuth, type AuthRequest } from "../lib/auth";
import { notifyUserPush } from "../lib/push";
import { buildUserSummary } from "./users";
import { ReelsRankingService } from "../services/reelsRanking";
import mongoose from "mongoose";

import { uploadBase64 } from "../lib/cloudinary";

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

// Format single reel object
async function buildReel(post: any, meId?: string) {
  const author = await User.findById(post.authorId);
  const reactionsSummary = computeReactionsSummary(post.reactions, post.likes, meId);

  const activeComments = Array.isArray(post.comments)
    ? post.comments.filter((c: any) => !c.isDeleted || (post.comments.some((sub: any) => sub.parentId?.toString() === c._id.toString() && !sub.isDeleted)))
    : [];

  return {
    id: post._id.toString(),
    caption: post.caption ?? null,
    mediaUrl: post.mediaUrl,
    mediaType: "video",
    thumbnailUrl: post.thumbnailUrl ?? null,
    duration: post.duration ?? null,
    audioTitle: post.audioTitle || (author ? `Original audio - ${author.username}` : "Original audio"),
    audioArtist: post.audioArtist || (author ? `@${author.username}` : ""),
    hashtags: post.hashtags ?? [],
    mentions: post.mentions ?? [],
    viewsCount: post.viewsCount ?? (post.views?.length || 0),
    sharesCount: post.sharesCount ?? 0,
    likesCount: reactionsSummary.likesCount,
    reactions: reactionsSummary.reactions,
    topReactions: reactionsSummary.topReactions,
    myReaction: reactionsSummary.myReaction,
    isLiked: reactionsSummary.isLiked,
    isSaved: meId && Array.isArray(post.saves) ? post.saves.some((id: mongoose.Types.ObjectId) => id.toString() === meId) : false,
    commentsCount: activeComments.length,
    audience: post.audience || "everyone",
    author: await buildUserSummary(author, meId),
    createdAt: post.createdAt ? post.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: post.updatedAt ? post.updatedAt.toISOString() : undefined,
  };
}

// Format comment item
async function formatCommentItem(comment: any, allComments: any[], meId?: string): Promise<any> {
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

// ── GET /api/reels ──────────────────────────────────────────────────────────
router.get("/reels", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(Math.max(1, parseInt(String(req.query.limit ?? "10"), 10)), 30);
  const skip = (page - 1) * limit;

  const hashtag = typeof req.query.hashtag === "string" ? req.query.hashtag.replace(/^#/, "").toLowerCase() : undefined;
  const audio = typeof req.query.audio === "string" ? req.query.audio.trim() : undefined;
  const targetUserId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const feedType = (typeof req.query.feed === "string" ? req.query.feed : "foryou") as "foryou" | "following";
  const seenIdsRaw = typeof req.query.seen === "string" ? req.query.seen.split(",") : [];
  const seenReelIds = new Set(seenIdsRaw);

  // 1. Generate Reel candidates
  const { candidates, authorMap, followingSet } = await ReelsRankingService.generateCandidates(req.userId, {
    feedType,
    hashtag,
    audio,
    targetUserId,
    limit: 80,
  });

  // 2. Rank candidates with watch completion, engagement velocity, and in-session diversity
  const rankedItems = ReelsRankingService.rankReels(candidates, authorMap, req.userId, followingSet, seenReelIds);

  const paginated = rankedItems.slice(skip, skip + limit);
  const reels = await Promise.all(
    paginated.map(async ({ reel, recommendationReason }) => {
      const formatted = await buildReel(reel, req.userId);
      return {
        ...formatted,
        recommendationReason,
      };
    })
  );

  res.json({
    reels,
    hasMore: skip + limit < rankedItems.length,
    total: rankedItems.length,
    page,
    rankerVersion: ReelsRankingService.VERSION,
  });
});

// ── POST /api/reels/upload ───────────────────────────────────────────────────
router.post("/reels/upload", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { data, mimeType } = req.body as { data?: string; mimeType?: string };
  if (!data || !mimeType) {
    res.status(400).json({ error: "data and mimeType required" });
    return;
  }
  try {
    const result = await uploadBase64(data, mimeType, "whiterchat/reels");
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Upload failed" });
  }
});

// ── POST /api/reels (Create Reel) ────────────────────────────────────────────
router.post("/reels", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { caption, mediaUrl, thumbnailUrl, duration, audioTitle, audioArtist, audience } = req.body;

  if (!mediaUrl) {
    res.status(400).json({ error: "mediaUrl is required" });
    return;
  }

  // Extract hashtags (#tag) and mentions (@user)
  const captionStr = typeof caption === "string" ? caption : "";
  const hashtagMatches = captionStr.match(/#[a-zA-Z0-9_\u0600-\u06FF]+/g) || [];
  const hashtags = Array.from(new Set(hashtagMatches.map((t) => t.slice(1).toLowerCase())));

  const mentionMatches = captionStr.match(/@[a-zA-Z0-9_.]+/g) || [];
  const mentions = Array.from(new Set(mentionMatches.map((m) => m.slice(1).toLowerCase())));

  const author = await User.findById(req.userId);

  const post = await Post.create({
    authorId: req.userId,
    caption: captionStr,
    mediaUrl,
    mediaType: "video",
    isReel: true,
    thumbnailUrl: thumbnailUrl || null,
    duration: typeof duration === "number" ? duration : null,
    audioTitle: audioTitle || (author ? `Original audio - ${author.username}` : "Original audio"),
    audioArtist: audioArtist || (author ? `@${author.username}` : ""),
    hashtags,
    mentions,
    audience: audience === "close_friends" ? "close_friends" : "everyone",
    viewsCount: 0,
    sharesCount: 0,
  });

  // Notify mentioned users
  if (mentions.length > 0) {
    const mentionedUsers = await User.find({ username: { $in: mentions } });
    for (const u of mentionedUsers) {
      if (u._id.toString() !== req.userId) {
        await Notification.create({
          userId: u._id,
          actorId: req.userId,
          type: "mention",
          postId: post._id,
        });
        notifyUserPush(u._id.toString(), req.userId!, "mention", { postId: post._id.toString() }).catch(() => {});
      }
    }
  }

  res.status(201).json(await buildReel(post, req.userId));
});

// ── GET /api/reels/:reelId ───────────────────────────────────────────────────
router.get("/reels/:reelId", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.reelId).catch(() => null);
  if (!post || (post.mediaType !== "video" && !post.isReel)) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }
  res.json(await buildReel(post, req.userId));
});

// ── POST /api/reels/:reelId/view (Record View) ───────────────────────────────
router.post("/reels/:reelId/view", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.reelId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }

  // Update views count and views array if logged in
  if (req.userId) {
    const meObjectId = new mongoose.Types.ObjectId(req.userId);
    const hasViewed = Array.isArray(post.views) && post.views.some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
    if (!hasViewed) {
      await Post.findByIdAndUpdate(post._id, {
        $addToSet: { views: meObjectId },
        $inc: { viewsCount: 1 },
      });
    }
  } else {
    await Post.findByIdAndUpdate(post._id, {
      $inc: { viewsCount: 1 },
    });
  }

  const updated = await Post.findById(post._id).select("viewsCount views");
  res.json({ success: true, viewsCount: updated?.viewsCount ?? (updated?.views?.length || 0) });
});

// ── POST /api/reels/:reelId/react (Rich Emoji Reaction) ──────────────────────
router.post("/reels/:reelId/react", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.reelId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }

  const { emoji } = req.body as { emoji?: string };
  const targetEmoji = (emoji && emoji.trim()) || "❤️";
  const meObjectId = new mongoose.Types.ObjectId(req.userId!);

  if (!post.reactions) post.reactions = [];
  if (!post.likes) post.likes = [];

  const existingReactionIdx = post.reactions.findIndex((r: any) => r.userId.toString() === req.userId);
  const existingLikeIdx = post.likes.findIndex((id: mongoose.Types.ObjectId) => id.toString() === req.userId);

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
    if (targetEmoji === "❤️") {
      post.likes.splice(existingLikeIdx, 1);
      newReactionState = null;
    } else {
      post.reactions.push({
        userId: meObjectId,
        emoji: targetEmoji,
        createdAt: new Date(),
      } as any);
      newReactionState = targetEmoji;
    }
  } else {
    // Add new reaction
    post.reactions.push({
      userId: meObjectId,
      emoji: targetEmoji,
      createdAt: new Date(),
    } as any);
    post.likes.push(meObjectId);
    newReactionState = targetEmoji;

    // Send notification to author
    if (post.authorId.toString() !== req.userId) {
      await Notification.create({
        userId: post.authorId,
        actorId: req.userId,
        type: "like",
        postId: post._id,
      });
      notifyUserPush(post.authorId.toString(), req.userId!, "like", { postId: post._id.toString() }).catch(() => {});
    }
  }

  await post.save();
  const summary = computeReactionsSummary(post.reactions, post.likes, req.userId);

  res.json({
    liked: summary.isLiked,
    likesCount: summary.likesCount,
    myReaction: summary.myReaction,
    reactions: summary.reactions,
    topReactions: summary.topReactions,
  });
});

// ── POST /api/reels/:reelId/like (Legacy / Quick like) ────────────────────────
router.post("/reels/:reelId/like", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.reelId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }

  const meId = new mongoose.Types.ObjectId(req.userId!);
  const isLiked = (post.likes || []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);

  if (isLiked) {
    await Post.findByIdAndUpdate(post._id, {
      $pull: { likes: meId, reactions: { userId: meId } },
    });
  } else {
    await Post.findByIdAndUpdate(post._id, {
      $addToSet: { likes: meId, reactions: { userId: meId, emoji: "❤️", createdAt: new Date() } },
    });
    if (post.authorId.toString() !== req.userId) {
      await Notification.create({ userId: post.authorId, actorId: req.userId, type: "like", postId: post._id });
      notifyUserPush(post.authorId.toString(), req.userId!, "like").catch(() => {});
    }
  }

  const updated = await Post.findById(post._id);
  const summary = computeReactionsSummary(updated?.reactions, updated?.likes, req.userId);
  res.json({ liked: summary.isLiked, likesCount: summary.likesCount, myReaction: summary.myReaction });
});

// ── POST /reels/:reelId/save ─────────────────────────────────────────────
router.post(["/reels/:reelId/save", "/api/reels/:reelId/save"], requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.reelId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }
  const meId = new mongoose.Types.ObjectId(req.userId!);
  const isSaved = (post.saves || []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
  if (isSaved) {
    await Post.findByIdAndUpdate(post._id, { $pull: { saves: meId } });
    res.json({ isSaved: false });
  } else {
    await Post.findByIdAndUpdate(post._id, { $addToSet: { saves: meId } });
    res.json({ isSaved: true });
  }
});
router.post("/reels/:reelId/save", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.reelId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }
  const meId = new mongoose.Types.ObjectId(req.userId!);
  const isSaved = (post.saves || []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
  if (isSaved) {
    await Post.findByIdAndUpdate(post._id, { $pull: { saves: meId } });
    res.json({ isSaved: false });
  } else {
    await Post.findByIdAndUpdate(post._id, { $addToSet: { saves: meId } });
    res.json({ isSaved: true });
  }
});

// ── POST /api/reels/:reelId/share ────────────────────────────────────────────
router.post("/reels/:reelId/share", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.reelId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }

  await Post.findByIdAndUpdate(post._id, { $inc: { sharesCount: 1 } });

  const { recipientId } = req.body as { recipientId?: string };
  if (recipientId && req.userId) {
    // Send directly into private chat
    const recipientUser = await User.findById(recipientId);
    if (recipientUser) {
      let conv = await Conversation.findOne({
        isGroup: false,
        $or: [
          { user1Id: req.userId, user2Id: recipientUser._id },
          { user1Id: recipientUser._id, user2Id: req.userId },
        ],
      });
      if (!conv) {
        conv = await Conversation.create({
          user1Id: req.userId,
          user2Id: recipientUser._id,
          isGroup: false,
          memberIds: [req.userId, recipientUser._id],
        });
      }
      await Message.create({
        conversationId: conv._id,
        senderId: req.userId,
        text: `Watched this Reel: ${post.caption || "Reel"}`,
        mediaUrl: post.mediaUrl,
        mediaType: "video",
      });
      await Notification.create({
        userId: recipientUser._id,
        actorId: req.userId,
        type: "share",
        postId: post._id,
      });
      notifyUserPush(recipientUser._id.toString(), req.userId, "share", { postId: post._id.toString() }).catch(() => {});
    }
  }

  const updated = await Post.findById(post._id).select("sharesCount");
  res.json({ success: true, sharesCount: updated?.sharesCount ?? 1 });
});

// ── PATCH /api/reels/:reelId (Edit Reel) ─────────────────────────────────────
router.patch("/reels/:reelId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.reelId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }
  if (post.authorId.toString() !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (req.body.caption !== undefined) {
    post.caption = req.body.caption;
    const hashtagMatches = (req.body.caption || "").match(/#[a-zA-Z0-9_\u0600-\u06FF]+/g) || [];
    post.hashtags = Array.from(new Set(hashtagMatches.map((t: string) => t.slice(1).toLowerCase())));
  }
  if (req.body.audience !== undefined) post.audience = req.body.audience;

  await post.save();
  res.json(await buildReel(post, req.userId));
});

// ── DELETE /api/reels/:reelId (Delete Reel) ──────────────────────────────────
router.delete("/reels/:reelId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.reelId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }
  if (post.authorId.toString() !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await post.deleteOne();
  res.sendStatus(204);
});

// ── GET /api/reels/:reelId/comments ──────────────────────────────────────────
router.get("/reels/:reelId/comments", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.reelId).catch(() => null);
  if (!post) {
    res.json([]);
    return;
  }

  const allComments = post.comments || [];
  const topLevelComments = allComments.filter((c: any) => !c.parentId);

  const formatted = await Promise.all(
    topLevelComments.map((c: any) => formatCommentItem(c, allComments, req.userId))
  );

  res.json(formatted);
});

// ── POST /api/reels/:reelId/comments ─────────────────────────────────────────
router.post("/reels/:reelId/comments", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.reelId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }

  if (post.commentsDisabled) {
    res.status(403).json({ error: "Comments are disabled for this reel" });
    return;
  }

  const { text, parentId, mediaType, mediaUrl, voiceDuration } = req.body;
  if (!text?.trim() && !mediaUrl) {
    res.status(400).json({ error: "Comment text or media attachment is required" });
    return;
  }

  const newComment = {
    _id: new mongoose.Types.ObjectId(),
    authorId: new mongoose.Types.ObjectId(req.userId!),
    text: text?.trim() || "",
    parentId: parentId ? new mongoose.Types.ObjectId(parentId) : null,
    mediaType: mediaType || null,
    mediaUrl: mediaUrl || null,
    voiceDuration: typeof voiceDuration === "number" ? voiceDuration : null,
    likes: [],
    reactions: [],
    isEdited: false,
    isDeleted: false,
    mentions: [],
    createdAt: new Date(),
  };

  if (!post.comments) post.comments = [];
  post.comments.push(newComment as any);
  await post.save();

  // Send notification to reel author
  if (post.authorId.toString() !== req.userId) {
    await Notification.create({
      userId: post.authorId,
      actorId: req.userId,
      type: "comment",
      postId: post._id,
    });
    notifyUserPush(post.authorId.toString(), req.userId!, "comment", {
      postId: post._id.toString(),
      commentText: text || "Sent a media comment",
    }).catch(() => {});
  }

  res.status(201).json(await formatCommentItem(newComment, post.comments, req.userId));
});

// ── POST /api/reels/:reelId/report (Report Reel) ──────────────────────────────
router.post("/reels/:reelId/report", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findById(req.params.reelId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }

  const { reason, details } = req.body as { reason?: string; details?: string };
  await Report.create({
    reporterId: req.userId,
    targetType: "post",
    targetPostId: post._id,
    reason: reason || "inappropriate_content",
    details: details || "Reported from Reels viewer",
    status: "pending",
  });

  res.json({ success: true, message: "Report submitted successfully" });
});

export default router;
