import { Router, type IRouter } from "express";
import { User, Post, Notification, Report } from "@workspace/db";
import { requireAuth, optionalAuth, type AuthRequest } from "../lib/auth";
import { uploadBase64 } from "../lib/cloudinary";
import { notifyUserPush } from "../lib/push";
import { OnboardingService, STANDARD_TOPICS } from "../services/onboardingService";
import mongoose from "mongoose";

const router: IRouter = Router();

export async function buildUserSummary(user: any, meId?: string) {
  if (!user) return { id: "", username: "[deleted]", fullName: "[deleted]", avatarUrl: null, isFollowing: false };
  const isFollowing = meId
    ? user.followers?.some((id: mongoose.Types.ObjectId) => id.toString() === meId)
    : false;
  return {
    id: user._id.toString(),
    username: user.username,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl ?? null,
    isFollowing,
  };
}

export async function buildUserProfile(user: any, meId?: string) {
  const [postsCount, reelsCount, userPosts] = await Promise.all([
    Post.countDocuments({ authorId: user._id }),
    Post.countDocuments({ authorId: user._id, mediaType: "video" }),
    Post.find({ authorId: user._id }).select("likes"),
  ]);

  const totalLikesCount = userPosts.reduce((acc, p) => acc + (p.likes?.length || 0), 0);

  const isFollowing = meId && meId !== user._id.toString()
    ? user.followers?.some((id: mongoose.Types.ObjectId) => id.toString() === meId)
    : false;

  let isBlocked = false;
  let isMuted = false;
  let isRestricted = false;

  if (meId && meId !== user._id.toString()) {
    const me = await User.findById(meId).select("blockedUsers mutedUsers restrictedUsers");
    if (me) {
      isBlocked = (me.blockedUsers ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === user._id.toString());
      isMuted = (me.mutedUsers ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === user._id.toString());
      isRestricted = (me.restrictedUsers ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === user._id.toString());
    }
  }

  const isMe = meId === user._id.toString();

  return {
    id: user._id.toString(),
    username: user.username,
    fullName: user.fullName,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    coverUrl: user.coverUrl ?? null,
    location: user.location ?? null,
    website: user.website ?? null,
    gender: user.gender ?? null,
    pronouns: user.pronouns ?? null,
    dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString() : null,
    phoneNumber: isMe ? (user.phoneNumber ?? null) : null,
    email: isMe ? user.email : null,
    interests: user.interests ?? [],
    profileCompleted: user.profileCompleted ?? false,
    isVerified: user.isVerified ?? false,
    role: user.role ?? "user",
    isPrivate: user.isPrivate ?? user.privacySettings?.privateAccount ?? false,
    twoFactorEnabled: isMe ? (user.twoFactorEnabled ?? false) : undefined,
    postsCount,
    reelsCount,
    totalLikesCount,
    followersCount: user.followers?.length ?? 0,
    followingCount: user.following?.length ?? 0,
    isFollowing,
    isMe,
    isBlocked,
    isMuted,
    isRestricted,
    customLinks: user.customLinks ?? [],
    privacySettings: isMe ? (user.privacySettings ?? {}) : undefined,
    notificationSettings: isMe ? (user.notificationSettings ?? {}) : undefined,
    messageSettings: isMe ? (user.messageSettings ?? {}) : undefined,
    contentSettings: isMe ? (user.contentSettings ?? {}) : undefined,
    languageSettings: isMe ? (user.languageSettings ?? {}) : undefined,
    accessibilitySettings: isMe ? (user.accessibilitySettings ?? {}) : undefined,
    savedCollections: isMe ? (user.savedCollections ?? []) : undefined,
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(await buildUserProfile(user, req.userId));
});

const handleSuggestions = async (req: AuthRequest, res: any): Promise<void> => {
  const topics = typeof req.query.topics === "string" ? req.query.topics.split(",") : undefined;
  const limit = Math.min(30, Math.max(1, parseInt(String(req.query.limit ?? "10"), 10)));
  const suggestions = await OnboardingService.getFollowSuggestions(req.userId, topics, limit);
  res.json(suggestions);
};

router.get("/users/suggestions", requireAuth, handleSuggestions);
router.get("/users/suggested", requireAuth, handleSuggestions);

// ── Onboarding API Endpoints ────────────────────────────────────────────────
router.get("/onboarding/topics", optionalAuth, async (_req, res): Promise<void> => {
  res.json({ topics: STANDARD_TOPICS });
});

router.get("/onboarding/suggestions", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const topics = typeof req.query.topics === "string" ? req.query.topics.split(",") : undefined;
  const limit = Math.min(30, Math.max(1, parseInt(String(req.query.limit ?? "15"), 10)));
  const suggestions = await OnboardingService.getFollowSuggestions(req.userId, topics, limit);
  res.json({ suggestions });
});

router.post("/onboarding/complete", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const updated = await OnboardingService.completeOnboarding(req.userId!, req.body);
    res.json(await buildUserProfile(updated, req.userId));
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to complete onboarding" });
  }
});

router.get("/users/me/saved", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const posts = await Post.find({ saves: req.userId }).sort({ createdAt: -1 });
  const result = await Promise.all(posts.map(async (post) => {
    const author = await User.findById(post.authorId);
    return {
      id: post._id.toString(), caption: post.caption ?? null, mediaUrl: post.mediaUrl, mediaType: post.mediaType,
      likesCount: post.likes.length, commentsCount: post.comments.length,
      isLiked: post.likes.some((id: mongoose.Types.ObjectId) => id.toString() === req.userId),
      isSaved: true,
      author: await buildUserSummary(author, req.userId),
      createdAt: post.createdAt.toISOString(),
    };
  }));
  res.json(result);
});

router.post("/users/complete-setup", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { bio, website, gender, pronouns, dateOfBirth, interests, avatarUrl } = req.body as {
    bio?: string; website?: string; gender?: string; pronouns?: string;
    dateOfBirth?: string; interests?: string[]; avatarUrl?: string;
  };
  const updates: Record<string, any> = { profileCompleted: true };
  if (bio !== undefined) updates.bio = bio;
  if (website) updates.website = website;
  if (gender) updates.gender = gender;
  if (pronouns) updates.pronouns = pronouns;
  if (dateOfBirth) updates.dateOfBirth = new Date(dateOfBirth);
  if (Array.isArray(interests)) updates.interests = interests;
  if (avatarUrl) updates.avatarUrl = avatarUrl;
  const user = await User.findByIdAndUpdate(req.userId, updates, { new: true });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(await buildUserProfile(user, req.userId));
});

router.patch("/users/me/profile", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const {
    fullName, bio, username, website, gender, pronouns, dateOfBirth,
    interests, location, coverUrl, phoneNumber, customLinks,
  } = req.body as {
    fullName?: string; bio?: string; username?: string; website?: string;
    gender?: string; pronouns?: string; dateOfBirth?: string; interests?: string[];
    location?: string; coverUrl?: string; phoneNumber?: string; customLinks?: Array<{ title: string; url: string }>;
  };
  const updates: Record<string, any> = {};
  if (fullName) updates.fullName = fullName;
  if (bio !== undefined) updates.bio = bio;
  if (username) updates.username = username;
  if (website !== undefined) updates.website = website;
  if (gender !== undefined) updates.gender = gender;
  if (pronouns !== undefined) updates.pronouns = pronouns;
  if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
  if (location !== undefined) updates.location = location;
  if (coverUrl !== undefined) updates.coverUrl = coverUrl;
  if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
  if (Array.isArray(customLinks)) updates.customLinks = customLinks;
  if (Array.isArray(interests)) updates.interests = interests;
  const user = await User.findByIdAndUpdate(req.userId, updates, { new: true });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(await buildUserProfile(user, req.userId));
});

router.post("/users/me/avatar", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { data, mimeType } = req.body as { data?: string; mimeType?: string };
  if (!data || !mimeType) { res.status(400).json({ error: "data and mimeType required" }); return; }
  try {
    const { url, publicId, resourceType } = await uploadBase64(data, mimeType, "whiterchat/avatars");
    await User.findByIdAndUpdate(req.userId, { avatarUrl: url });
    res.json({ url, publicId, resourceType });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    res.status(500).json({ error: msg });
  }
});

router.post("/users/me/cover", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { data, mimeType } = req.body as { data?: string; mimeType?: string };
  if (!data || !mimeType) { res.status(400).json({ error: "data and mimeType required" }); return; }
  try {
    const { url, publicId, resourceType } = await uploadBase64(data, mimeType, "whiterchat/covers");
    await User.findByIdAndUpdate(req.userId, { coverUrl: url });
    res.json({ url, publicId, resourceType });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    res.status(500).json({ error: msg });
  }
});

router.delete("/users/me/cover", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    await User.findByIdAndUpdate(req.userId, { $unset: { coverUrl: 1 } });
    res.json({ message: "Cover removed successfully", url: null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Remove failed";
    res.status(500).json({ error: msg });
  }
});

router.get("/users/:username", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findOne({ username: req.params.username });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(await buildUserProfile(user, req.userId));
});

router.get("/users/:username/posts", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findOne({ username: req.params.username });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const limit = parseInt(String(req.query.limit ?? "12"), 10);
  const skip = (page - 1) * limit;
  const [posts, total] = await Promise.all([
    Post.find({ authorId: user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Post.countDocuments({ authorId: user._id }),
  ]);
  const result = await Promise.all(posts.map(async (post) => ({
    id: post._id.toString(), caption: post.caption ?? null, mediaUrl: post.mediaUrl, mediaType: post.mediaType,
    likesCount: post.likes.length, commentsCount: post.comments.length,
    isLiked: req.userId ? post.likes.some((id: mongoose.Types.ObjectId) => id.toString() === req.userId) : false,
    isSaved: req.userId ? post.saves.some((id: mongoose.Types.ObjectId) => id.toString() === req.userId) : false,
    author: await buildUserSummary(user, req.userId),
    createdAt: post.createdAt.toISOString(),
  })));
  res.json({ posts: result, hasMore: skip + limit < total, total });
});

router.get("/users/:username/reels", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findOne({ username: req.params.username });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const limit = parseInt(String(req.query.limit ?? "12"), 10);
  const skip = (page - 1) * limit;
  const [reels, total] = await Promise.all([
    Post.find({ authorId: user._id, mediaType: "video" }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Post.countDocuments({ authorId: user._id, mediaType: "video" }),
  ]);
  const result = await Promise.all(reels.map(async (post) => ({
    id: post._id.toString(), caption: post.caption ?? null, mediaUrl: post.mediaUrl, mediaType: post.mediaType,
    likesCount: post.likes.length, commentsCount: post.comments.length,
    isLiked: req.userId ? post.likes.some((id: mongoose.Types.ObjectId) => id.toString() === req.userId) : false,
    isSaved: req.userId ? post.saves.some((id: mongoose.Types.ObjectId) => id.toString() === req.userId) : false,
    author: await buildUserSummary(user, req.userId),
    createdAt: post.createdAt.toISOString(),
  })));
  res.json({ reels: result, hasMore: skip + limit < total, total });
});

router.get("/users/:username/media", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findOne({ username: req.params.username });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const limit = parseInt(String(req.query.limit ?? "12"), 10);
  const skip = (page - 1) * limit;
  const [mediaPosts, total] = await Promise.all([
    Post.find({ authorId: user._id, mediaUrl: { $ne: null } }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Post.countDocuments({ authorId: user._id, mediaUrl: { $ne: null } }),
  ]);
  const result = await Promise.all(mediaPosts.map(async (post) => ({
    id: post._id.toString(), caption: post.caption ?? null, mediaUrl: post.mediaUrl, mediaType: post.mediaType,
    likesCount: post.likes.length, commentsCount: post.comments.length,
    isLiked: req.userId ? post.likes.some((id: mongoose.Types.ObjectId) => id.toString() === req.userId) : false,
    isSaved: req.userId ? post.saves.some((id: mongoose.Types.ObjectId) => id.toString() === req.userId) : false,
    author: await buildUserSummary(user, req.userId),
    createdAt: post.createdAt.toISOString(),
  })));
  res.json({ media: result, hasMore: skip + limit < total, total });
});

router.get("/users/:username/saved", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findOne({ username: req.params.username });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user._id.toString() !== req.userId) {
    res.json({ posts: [], hasMore: false, total: 0 });
    return;
  }
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const limit = parseInt(String(req.query.limit ?? "12"), 10);
  const skip = (page - 1) * limit;
  const [posts, total] = await Promise.all([
    Post.find({ saves: req.userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Post.countDocuments({ saves: req.userId }),
  ]);
  const result = await Promise.all(posts.map(async (post) => {
    const author = await User.findById(post.authorId);
    return {
      id: post._id.toString(), caption: post.caption ?? null, mediaUrl: post.mediaUrl, mediaType: post.mediaType,
      likesCount: post.likes.length, commentsCount: post.comments.length,
      isLiked: post.likes.some((id: mongoose.Types.ObjectId) => id.toString() === req.userId),
      isSaved: true,
      author: await buildUserSummary(author, req.userId),
      createdAt: post.createdAt.toISOString(),
    };
  }));
  res.json({ posts: result, hasMore: skip + limit < total, total });
});

router.get("/users/:username/liked", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findOne({ username: req.params.username });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user._id.toString() !== req.userId) {
    res.json({ posts: [], hasMore: false, total: 0 });
    return;
  }
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const limit = parseInt(String(req.query.limit ?? "12"), 10);
  const skip = (page - 1) * limit;
  const [posts, total] = await Promise.all([
    Post.find({ likes: user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Post.countDocuments({ likes: user._id }),
  ]);
  const result = await Promise.all(posts.map(async (post) => {
    const author = await User.findById(post.authorId);
    return {
      id: post._id.toString(), caption: post.caption ?? null, mediaUrl: post.mediaUrl, mediaType: post.mediaType,
      likesCount: post.likes.length, commentsCount: post.comments.length,
      isLiked: true,
      isSaved: req.userId ? post.saves.some((id: mongoose.Types.ObjectId) => id.toString() === req.userId) : false,
      author: await buildUserSummary(author, req.userId),
      createdAt: post.createdAt.toISOString(),
    };
  }));
  res.json({ posts: result, hasMore: skip + limit < total, total });
});

router.get("/users/:username/liked-posts", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findOne({ username: req.params.username });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  // Only owner can see their liked posts for privacy unless allowed
  if (user._id.toString() !== req.userId) {
    res.json({ posts: [], hasMore: false, total: 0 });
    return;
  }
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const limit = parseInt(String(req.query.limit ?? "12"), 10);
  const skip = (page - 1) * limit;
  const [posts, total] = await Promise.all([
    Post.find({ likes: user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Post.countDocuments({ likes: user._id }),
  ]);
  const result = await Promise.all(posts.map(async (post) => {
    const author = await User.findById(post.authorId);
    return {
      id: post._id.toString(), caption: post.caption ?? null, mediaUrl: post.mediaUrl, mediaType: post.mediaType,
      likesCount: post.likes.length, commentsCount: post.comments.length,
      isLiked: true,
      isSaved: req.userId ? post.saves.some((id: mongoose.Types.ObjectId) => id.toString() === req.userId) : false,
      author: await buildUserSummary(author, req.userId),
      createdAt: post.createdAt.toISOString(),
    };
  }));
  res.json({ posts: result, hasMore: skip + limit < total, total });
});

async function findUserByIdOrUsername(param: string) {
  const isObjId = mongoose.Types.ObjectId.isValid(param);
  if (isObjId) {
    const byId = await User.findById(param);
    if (byId) return byId;
  }
  return await User.findOne({ username: param });
}

router.post("/users/:username/follow", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const target = await findUserByIdOrUsername(req.params.username);
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  if (target._id.toString() === req.userId) { res.status(400).json({ error: "Cannot follow yourself" }); return; }
  const meId = new mongoose.Types.ObjectId(req.userId!);
  const alreadyFollowing = target.followers.some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
  if (!alreadyFollowing) {
    await User.findByIdAndUpdate(target._id, { $addToSet: { followers: meId } });
    await User.findByIdAndUpdate(req.userId, { $addToSet: { following: target._id } });
    await Notification.create({ userId: target._id, actorId: req.userId, type: "follow" });
    notifyUserPush(target._id.toString(), req.userId!, "follow").catch(() => {});
  }
  const updated = await User.findById(target._id);
  res.json({ isFollowing: true, followersCount: updated?.followers.length ?? 0 });
});

router.post("/users/:username/unfollow", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const target = await findUserByIdOrUsername(req.params.username);
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  const meId = new mongoose.Types.ObjectId(req.userId!);
  await User.findByIdAndUpdate(target._id, { $pull: { followers: meId } });
  await User.findByIdAndUpdate(req.userId, { $pull: { following: target._id } });
  const updated = await User.findById(target._id);
  res.json({ isFollowing: false, followersCount: updated?.followers.length ?? 0 });
});

router.get("/users/:username/followers", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const target = await findUserByIdOrUsername(req.params.username);
  if (!target) { res.status(404).json({ error: "User not found" }); return; }

  const meId = req.userId;
  const isMe = meId === target._id.toString();
  const isPrivate = target.isPrivate || (target as any).privacySettings?.privateAccount;
  const isFollower = meId ? target.followers.some((id: mongoose.Types.ObjectId) => id.toString() === meId) : false;

  if (isPrivate && !isMe && !isFollower) {
    res.status(403).json({ error: "This account is private", isPrivate: true, users: [], totalCount: 0, hasMore: false });
    return;
  }

  await target.populate("followers");
  let list = (target.followers as any[]) || [];

  if (meId) {
    const me = await User.findById(meId).select("blockedUsers");
    const blockedIds = new Set((me?.blockedUsers || []).map((id: any) => id.toString()));
    const targetBlockedIds = new Set((target.blockedUsers || []).map((id: any) => id.toString()));
    list = list.filter((u) => u && u._id && !blockedIds.has(u._id.toString()) && !targetBlockedIds.has(u._id.toString()));
  }

  const q = ((req.query.q || req.query.search) as string || "").trim().toLowerCase();
  if (q) {
    list = list.filter((u) =>
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.fullName && u.fullName.toLowerCase().includes(q))
    );
  }

  const totalCount = list.length;
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || "20", 10)));
  const startIndex = (page - 1) * limit;
  const paginatedSlice = list.slice(startIndex, startIndex + limit);

  const userSummaries = await Promise.all(paginatedSlice.map((u) => buildUserSummary(u, meId)));

  res.json({
    users: userSummaries,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit) || 1,
    hasMore: startIndex + limit < totalCount,
  });
});

router.get("/users/:username/following", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const target = await findUserByIdOrUsername(req.params.username);
  if (!target) { res.status(404).json({ error: "User not found" }); return; }

  const meId = req.userId;
  const isMe = meId === target._id.toString();
  const isPrivate = target.isPrivate || (target as any).privacySettings?.privateAccount;
  const isFollower = meId ? target.followers.some((id: mongoose.Types.ObjectId) => id.toString() === meId) : false;

  if (isPrivate && !isMe && !isFollower) {
    res.status(403).json({ error: "This account is private", isPrivate: true, users: [], totalCount: 0, hasMore: false });
    return;
  }

  await target.populate("following");
  let list = (target.following as any[]) || [];

  if (meId) {
    const me = await User.findById(meId).select("blockedUsers");
    const blockedIds = new Set((me?.blockedUsers || []).map((id: any) => id.toString()));
    const targetBlockedIds = new Set((target.blockedUsers || []).map((id: any) => id.toString()));
    list = list.filter((u) => u && u._id && !blockedIds.has(u._id.toString()) && !targetBlockedIds.has(u._id.toString()));
  }

  const q = ((req.query.q || req.query.search) as string || "").trim().toLowerCase();
  if (q) {
    list = list.filter((u) =>
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.fullName && u.fullName.toLowerCase().includes(q))
    );
  }

  const totalCount = list.length;
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || "20", 10)));
  const startIndex = (page - 1) * limit;
  const paginatedSlice = list.slice(startIndex, startIndex + limit);

  const userSummaries = await Promise.all(paginatedSlice.map((u) => buildUserSummary(u, meId)));

  res.json({
    users: userSummaries,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit) || 1,
    hasMore: startIndex + limit < totalCount,
  });
});

router.post("/users/:username/remove-follower", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const target = await findUserByIdOrUsername(req.params.username);
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  if (target._id.toString() !== req.userId) {
    res.status(403).json({ error: "You can only remove followers from your own account" });
    return;
  }
  const { followerId } = req.body as { followerId: string };
  if (!followerId) { res.status(400).json({ error: "followerId is required" }); return; }

  const followerUser = await findUserByIdOrUsername(followerId);
  if (!followerUser) { res.status(404).json({ error: "Follower user not found" }); return; }

  const meId = target._id;
  const followerObjId = followerUser._id;

  await User.findByIdAndUpdate(meId, { $pull: { followers: followerObjId } });
  await User.findByIdAndUpdate(followerObjId, { $pull: { following: meId } });

  const updated = await User.findById(meId);
  res.json({ ok: true, followersCount: updated?.followers.length ?? 0 });
});

// ── Block / Unblock / Report ─────────────────────────────────────────────────

router.get("/users/me/blocked", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const me = await User.findById(req.userId).populate("blockedUsers");
  if (!me) { res.status(404).json({ error: "User not found" }); return; }
  res.json(await Promise.all((me.blockedUsers as any[]).map((u) => buildUserSummary(u, req.userId))));
});

router.post("/users/:username/block", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const target = await User.findOne({ username: req.params.username });
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  if (target._id.toString() === req.userId) { res.status(400).json({ error: "Cannot block yourself" }); return; }
  const meId = new mongoose.Types.ObjectId(req.userId!);
  await User.findByIdAndUpdate(req.userId, { $addToSet: { blockedUsers: target._id } });
  // Blocking implies unfollowing each other so the blocked user disappears from feed/follow lists.
  await User.findByIdAndUpdate(req.userId, { $pull: { following: target._id, followers: target._id } });
  await User.findByIdAndUpdate(target._id, { $pull: { following: meId, followers: meId } });
  res.json({ ok: true, isBlocked: true });
});

router.post("/users/:username/unblock", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const target = await User.findOne({ username: req.params.username });
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  await User.findByIdAndUpdate(req.userId, { $pull: { blockedUsers: target._id } });
  res.json({ ok: true, isBlocked: false });
});

router.post("/users/:username/report", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const target = await User.findOne({ username: req.params.username });
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  const { reason, details } = req.body as { reason?: string; details?: string };
  if (!reason) { res.status(400).json({ error: "reason is required" }); return; }
  await Report.create({
    reporterId: req.userId,
    targetType: "user",
    targetUserId: target._id,
    reason,
    details: details ?? null,
  });
  res.status(201).json({ ok: true });
});

export default router;
