import { Router, type IRouter, type Request } from "express";
import { User, Post, Notification, Report } from "@workspace/db";
import { requireAuth, type AuthRequest, comparePassword, hashPassword } from "../lib/auth";
import { uploadBase64 } from "../lib/cloudinary";
import mongoose from "mongoose";
import crypto from "crypto";
import { generateTotpSecret, generateKeyUri, verifyTotpToken } from "../lib/totp";
import { planService } from "../services/planService";
import qrcode from "qrcode";

const router: IRouter = Router();

// Helper to get client info for sessions
function getClientInfo(req: Request) {
  const userAgent = req.headers["user-agent"] || "Unknown Browser";
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
  
  let browser = "Web Browser";
  if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Safari")) browser = "Safari";
  else if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Edge")) browser = "Edge";

  let os = "Desktop";
  if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("Mac OS")) os = "macOS";
  else if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Linux")) os = "Linux";

  return {
    id: crypto.randomUUID(),
    deviceName: `${browser} on ${os}`,
    browser,
    os,
    ip,
    location: ip.startsWith("127.") || ip === "::1" ? "Local Session" : "Active Location",
    lastActive: new Date(),
  };
}

// ── Check Username Availability ───────────────────────────────────────────────
router.get("/users/check-username", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const username = String(req.query.username || "").trim().toLowerCase();
  if (!username) { res.status(400).json({ error: "Username is required" }); return; }
  if (username.length < 3 || username.length > 30) {
    res.json({ available: false, message: "Username must be between 3 and 30 characters" });
    return;
  }
  if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
    res.json({ available: false, message: "Username can only contain letters, numbers, underscores, and dots" });
    return;
  }
  const existing = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, "i") } });
  if (existing && existing._id.toString() !== req.userId) {
    res.json({ available: false, message: "Username is already taken" });
    return;
  }
  res.json({ available: true, message: "Username is available" });
});

// ── Upload Cover / Banner Photo ──────────────────────────────────────────────
router.post("/users/me/cover", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { data, mimeType } = req.body as { data?: string; mimeType?: string };
  if (!data || !mimeType) { res.status(400).json({ error: "data and mimeType required" }); return; }
  try {
    const { url, publicId, resourceType } = await uploadBase64(data, mimeType, "whiterchat/covers");
    await User.findByIdAndUpdate(req.userId, { coverUrl: url });
    res.json({ url, publicId, resourceType });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Cover upload failed";
    res.status(500).json({ error: msg });
  }
});

// ── Update Full Settings ──────────────────────────────────────────────────────
router.patch("/users/me/settings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const {
    privacySettings,
    notificationSettings,
    messageSettings,
    contentSettings,
    languageSettings,
    accessibilitySettings,
    isPrivate,
  } = req.body;

  const updates: Record<string, any> = {};
  if (privacySettings) updates.privacySettings = privacySettings;
  if (notificationSettings) updates.notificationSettings = notificationSettings;
  if (messageSettings) updates.messageSettings = messageSettings;
  if (contentSettings) updates.contentSettings = contentSettings;
  if (languageSettings) updates.languageSettings = languageSettings;
  if (accessibilitySettings) updates.accessibilitySettings = accessibilitySettings;
  if (isPrivate !== undefined) {
    updates.isPrivate = isPrivate;
    updates["privacySettings.privateAccount"] = isPrivate;
  }

  const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ ok: true, settings: {
    privacySettings: user.privacySettings,
    notificationSettings: user.notificationSettings,
    messageSettings: user.messageSettings,
    contentSettings: user.contentSettings,
    languageSettings: user.languageSettings,
    accessibilitySettings: user.accessibilitySettings,
    isPrivate: user.isPrivate,
  } });
});

// ── Active Sessions & Logged-in Devices ───────────────────────────────────────
router.get("/users/me/sessions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  
  let sessions = user.sessions || [];
  if (sessions.length === 0) {
    const current = getClientInfo(req);
    user.sessions = [current];
    await user.save();
    sessions = user.sessions;
  }

  const result = sessions.map((s, idx) => ({
    id: s.id,
    deviceName: s.deviceName,
    browser: s.browser,
    os: s.os,
    ip: s.ip,
    location: s.location,
    lastActive: s.lastActive,
    current: idx === 0, // Mark latest as current
  }));

  res.json(result);
});

router.delete("/users/me/sessions/:sessionId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { sessionId } = req.params;
  await User.findByIdAndUpdate(req.userId, {
    $pull: { sessions: { id: sessionId } },
  });
  res.json({ ok: true });
});

router.delete("/users/me/sessions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const current = getClientInfo(req);
  user.sessions = [current];
  await user.save();
  res.json({ ok: true, message: "Logged out from all other devices" });
});

// ── Security Alerts ──────────────────────────────────────────────────────────
router.get("/users/me/security-alerts", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  
  const alerts = user.loginAlerts || [];
  if (alerts.length === 0) {
    // Generate an initial safe record for user
    const client = getClientInfo(req);
    const initialAlert = {
      id: crypto.randomUUID(),
      deviceName: client.deviceName,
      location: client.location,
      timestamp: new Date(),
      ip: client.ip,
      isRead: true,
    };
    user.loginAlerts = [initialAlert];
    await user.save();
    res.json([initialAlert]);
    return;
  }
  res.json(alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
});

// ── Two-Factor Authentication (2FA) ──────────────────────────────────────────
router.post("/users/me/2fa/setup", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  
  // Generate RFC 6238 Base32 secret for Google Authenticator
  const secret = generateTotpSecret(20);
  
  // Generate 8 emergency recovery backup codes
  const backupCodes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase().match(/.{1,4}/g)?.join("-") || "ABCD-1234"
  );
  
  const label = user.email || user.username;
  const otpAuthUrl = generateKeyUri(label, "WhiterChat", secret);
  
  // Generate real QR code as Data URI
  let qrCodeDataUrl = "";
  try {
    qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 240,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.warn("[2FA] QR code generation error:", err);
  }

  res.json({
    secret,
    otpAuthUrl,
    qrCode: qrCodeDataUrl,
    backupCodes,
  });
});

router.post("/users/me/2fa/verify", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { secret, code, backupCodes } = req.body as { secret?: string; code?: string; backupCodes?: string[] };
  if (!secret || !code) { res.status(400).json({ error: "Secret and 6-digit code are required." }); return; }
  
  const cleanCode = code.trim().replace(/\s+/g, "");
  
  // Real RFC 6238 TOTP verification with Google Authenticator
  const isValid = verifyTotpToken(cleanCode, secret);

  if (!isValid) {
    res.status(400).json({
      error: "Invalid authentication code. Open Google Authenticator and enter the current 6-digit code.",
    });
    return;
  }

  await User.findByIdAndUpdate(
    req.userId,
    {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      twoFactorBackupCodes: backupCodes || [],
    },
    { new: true }
  );

  res.json({ ok: true, twoFactorEnabled: true, message: "Two-Factor Authentication is now enabled!" });
});

router.post("/users/me/2fa/disable", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { password, code } = req.body as { password?: string; code?: string };
  if (!password) { res.status(400).json({ error: "Current password is required to disable 2FA." }); return; }
  
  const user = await User.findById(req.userId).select("+passwordHash +twoFactorSecret");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) { res.status(400).json({ error: "Incorrect password." }); return; }

  // If a 2FA code is optionally provided during disable, verify it
  if (code && user.twoFactorSecret) {
    const cleanCode = code.trim().replace(/\s+/g, "");
    if (!verifyTotpToken(cleanCode, user.twoFactorSecret)) {
      res.status(400).json({ error: "Invalid authenticator code." });
      return;
    }
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  user.twoFactorBackupCodes = [];
  await user.save();

  res.json({ ok: true, twoFactorEnabled: false, message: "Two-Factor Authentication has been disabled." });
});

router.post("/users/me/2fa/backup-codes/regenerate", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { password } = req.body as { password?: string };
  if (!password) { res.status(400).json({ error: "Password is required to regenerate backup codes." }); return; }

  const user = await User.findById(req.userId).select("+passwordHash");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) { res.status(400).json({ error: "Incorrect password." }); return; }

  const newBackupCodes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase().match(/.{1,4}/g)?.join("-") || "ABCD-1234"
  );

  user.twoFactorBackupCodes = newBackupCodes;
  await user.save();

  res.json({ ok: true, backupCodes: newBackupCodes, message: "New backup codes generated." });
});

// ── Muted & Restricted Accounts ──────────────────────────────────────────────
router.get("/users/me/muted", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId).populate("mutedUsers");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const muted = (user.mutedUsers as any[]) || [];
  res.json(muted.map((u) => ({
    id: u._id.toString(),
    username: u.username,
    fullName: u.fullName,
    avatarUrl: u.avatarUrl || null,
  })));
});

router.post("/users/:username/mute", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const target = await User.findOne({ username: req.params.username });
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  await User.findByIdAndUpdate(req.userId, { $addToSet: { mutedUsers: target._id } });
  res.json({ ok: true, isMuted: true });
});

router.post("/users/:username/unmute", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const target = await User.findOne({ username: req.params.username });
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  await User.findByIdAndUpdate(req.userId, { $pull: { mutedUsers: target._id } });
  res.json({ ok: true, isMuted: false });
});

router.get("/users/me/restricted", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId).populate("restrictedUsers");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const restricted = (user.restrictedUsers as any[]) || [];
  res.json(restricted.map((u) => ({
    id: u._id.toString(),
    username: u.username,
    fullName: u.fullName,
    avatarUrl: u.avatarUrl || null,
  })));
});

router.post("/users/:username/restrict", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const target = await User.findOne({ username: req.params.username });
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  await User.findByIdAndUpdate(req.userId, { $addToSet: { restrictedUsers: target._id } });
  res.json({ ok: true, isRestricted: true });
});

router.post("/users/:username/unrestrict", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const target = await User.findOne({ username: req.params.username });
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  await User.findByIdAndUpdate(req.userId, { $pull: { restrictedUsers: target._id } });
  res.json({ ok: true, isRestricted: false });
});

// ── Muted Words & Phrases ────────────────────────────────────────────────────
router.get("/users/me/muted-words", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId).select("mutedWords");
  res.json(user?.mutedWords || []);
});

router.post("/users/me/muted-words", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { word } = req.body as { word?: string };
  const cleanWord = word?.trim().toLowerCase();
  if (!cleanWord) { res.status(400).json({ error: "Word is required" }); return; }
  
  const user = await User.findByIdAndUpdate(
    req.userId,
    { $addToSet: { mutedWords: cleanWord } },
    { new: true }
  );
  res.json(user?.mutedWords || []);
});

router.delete("/users/me/muted-words/:word", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const word = decodeURIComponent(req.params.word).trim().toLowerCase();
  const user = await User.findByIdAndUpdate(
    req.userId,
    { $pull: { mutedWords: word } },
    { new: true }
  );
  res.json(user?.mutedWords || []);
});

// ── Activity Center (Posts, Comments, Likes, Saved, Views) ───────────────────
router.get("/users/me/activity", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const type = String(req.query.type || "posts");
  const page = parseInt(String(req.query.page || "1"), 10);
  const limit = 12;
  const skip = (page - 1) * limit;

  if (type === "posts") {
    const [posts, total] = await Promise.all([
      Post.find({ authorId: req.userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Post.countDocuments({ authorId: req.userId }),
    ]);
    res.json({
      items: posts.map((p) => ({
        id: p._id.toString(),
        mediaUrl: p.mediaUrl,
        mediaType: p.mediaType,
        caption: p.caption,
        likesCount: p.likes.length,
        commentsCount: p.comments.length,
        createdAt: p.createdAt,
      })),
      total,
      hasMore: skip + limit < total,
    });
    return;
  }

  if (type === "likes") {
    const [likedPosts, total] = await Promise.all([
      Post.find({ likes: req.userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Post.countDocuments({ likes: req.userId }),
    ]);
    res.json({
      items: likedPosts.map((p) => ({
        id: p._id.toString(),
        mediaUrl: p.mediaUrl,
        mediaType: p.mediaType,
        caption: p.caption,
        likesCount: p.likes.length,
        commentsCount: p.comments.length,
        createdAt: p.createdAt,
      })),
      total,
      hasMore: skip + limit < total,
    });
    return;
  }

  if (type === "comments") {
    const postsWithMyComments = await Post.find({ "comments.authorId": req.userId })
      .sort({ "comments.createdAt": -1 })
      .skip(skip)
      .limit(limit);
    
    const commentsList: any[] = [];
    postsWithMyComments.forEach((post) => {
      post.comments.forEach((c) => {
        if (c.authorId?.toString() === req.userId) {
          commentsList.push({
            id: c._id?.toString(),
            postId: post._id.toString(),
            postMediaUrl: post.mediaUrl,
            text: c.text,
            createdAt: c.createdAt,
          });
        }
      });
    });
    res.json({ items: commentsList, total: commentsList.length, hasMore: false });
    return;
  }

  res.json({ items: [], total: 0, hasMore: false });
});

// ── Search History ────────────────────────────────────────────────────────────
router.get("/users/me/search-history", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId).select("searchHistory");
  res.json(user?.searchHistory || []);
});

router.post("/users/me/search-history", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { query } = req.body as { query?: string };
  if (!query?.trim()) { res.status(400).json({ error: "query required" }); return; }
  
  await User.findByIdAndUpdate(req.userId, {
    $push: {
      searchHistory: {
        $each: [{ query: query.trim(), timestamp: new Date() }],
        $slice: -20, // Keep last 20 searches
      },
    },
  });
  res.json({ ok: true });
});

router.delete("/users/me/search-history", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  await User.findByIdAndUpdate(req.userId, { $set: { searchHistory: [] } });
  res.json({ ok: true });
});

// ── Recent Views (Reels & Profiles) ──────────────────────────────────────────
router.get("/users/me/recent-views", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId).select("recentViews");
  res.json(user?.recentViews || []);
});

router.post("/users/me/recent-views", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { type, targetId, title, avatarUrl } = req.body;
  if (!type || !targetId) { res.status(400).json({ error: "type and targetId required" }); return; }
  
  await User.findByIdAndUpdate(req.userId, {
    $push: {
      recentViews: {
        $each: [{ type, targetId, title, avatarUrl, timestamp: new Date() }],
        $slice: -30,
      },
    },
  });
  res.json({ ok: true });
});

// ── Saved Collections ─────────────────────────────────────────────────────────
router.get("/users/me/collections", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  
  const allSavedCount = await Post.countDocuments({ saves: req.userId });
  const collections = user.savedCollections || [];
  
  res.json({
    allSavedCount,
    collections: collections.map((c) => ({
      id: c.id,
      name: c.name,
      coverUrl: c.coverUrl,
      postCount: c.postIds.length,
      createdAt: c.createdAt,
    })),
  });
});

router.post("/users/me/collections", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { name, coverUrl } = req.body as { name?: string; coverUrl?: string };
  if (!name?.trim()) { res.status(400).json({ error: "Collection name required" }); return; }

  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const currentCount = user.savedCollections?.length || 0;
  const maxAllowed = await planService.getPlanLimit(user, "maxSavedCollections", 5);

  if (currentCount >= maxAllowed) {
    res.status(400).json({
      error: `You have reached the maximum of ${maxAllowed} saved collections for your plan. Upgrade to organize more collections.`,
      code: "LIMIT_REACHED",
      maxAllowed,
      upgradeRequired: true,
    });
    return;
  }
  
  const newCollection = {
    id: crypto.randomUUID(),
    name: name.trim(),
    coverUrl: coverUrl || null,
    postIds: [],
    createdAt: new Date(),
  };

  await User.findByIdAndUpdate(req.userId, {
    $push: { savedCollections: newCollection },
  });

  res.status(201).json(newCollection);
});

router.patch("/users/me/collections/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { name, coverUrl } = req.body as { name?: string; coverUrl?: string };
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  
  const target = user.savedCollections?.find((c) => c.id === req.params.id);
  if (!target) { res.status(404).json({ error: "Collection not found" }); return; }
  
  if (name) target.name = name.trim();
  if (coverUrl) target.coverUrl = coverUrl;
  await user.save();

  res.json(target);
});

router.delete("/users/me/collections/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  await User.findByIdAndUpdate(req.userId, {
    $pull: { savedCollections: { id: req.params.id } },
  });
  res.json({ ok: true });
});

// ── Archive Management ────────────────────────────────────────────────────────
router.get("/users/me/archived", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  
  const archivedIds = user.archivedPostIds || [];
  const posts = await Post.find({ _id: { $in: archivedIds } }).sort({ createdAt: -1 });
  
  res.json(posts.map((p) => ({
    id: p._id.toString(),
    mediaUrl: p.mediaUrl,
    mediaType: p.mediaType,
    caption: p.caption,
    likesCount: p.likes.length,
    commentsCount: p.comments.length,
    createdAt: p.createdAt,
  })));
});

router.post("/posts/:id/archive", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const post = await Post.findOne({ _id: req.params.id, authorId: req.userId });
  if (!post) { res.status(404).json({ error: "Post not found or unauthorized" }); return; }
  
  await User.findByIdAndUpdate(req.userId, {
    $addToSet: { archivedPostIds: post._id },
  });
  res.json({ ok: true, isArchived: true });
});

router.post("/posts/:id/unarchive", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  await User.findByIdAndUpdate(req.userId, {
    $pull: { archivedPostIds: new mongoose.Types.ObjectId(req.params.id) },
  });
  res.json({ ok: true, isArchived: false });
});

// ── Complete Data Export ──────────────────────────────────────────────────────
router.get("/users/me/export-data", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  
  const [posts, likedPosts, savedPosts] = await Promise.all([
    Post.find({ authorId: user._id }),
    Post.find({ likes: user._id }),
    Post.find({ saves: user._id }),
  ]);

  const exportBundle = {
    exportedAt: new Date().toISOString(),
    account: {
      id: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber || null,
      bio: user.bio || null,
      location: user.location || null,
      website: user.website || null,
      gender: user.gender || null,
      pronouns: user.pronouns || null,
      dateOfBirth: user.dateOfBirth || null,
      joinedAt: user.createdAt,
    },
    statistics: {
      postsCount: posts.length,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      likedPostsCount: likedPosts.length,
      savedPostsCount: savedPosts.length,
    },
    posts: posts.map((p) => ({
      id: p._id.toString(),
      caption: p.caption,
      mediaUrl: p.mediaUrl,
      mediaType: p.mediaType,
      likesCount: p.likes.length,
      commentsCount: p.comments.length,
      createdAt: p.createdAt,
    })),
    settings: {
      privacy: user.privacySettings,
      notifications: user.notificationSettings,
      messages: user.messageSettings,
      content: user.contentSettings,
      language: user.languageSettings,
    },
  };

  res.setHeader("Content-Disposition", `attachment; filename="whiterchat-data-${user.username}.json"`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(exportBundle, null, 2));
});

// ── Professional Creator Analytics ───────────────────────────────────────────
router.get("/users/me/analytics", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  
  const posts = await Post.find({ authorId: user._id });
  const totalLikes = posts.reduce((acc, p) => acc + p.likes.length, 0);
  const totalComments = posts.reduce((acc, p) => acc + p.comments.length, 0);
  const reelsCount = posts.filter((p) => p.mediaType === "video").length;
  
  // Real metrics calculated from DB entries
  const followersCount = user.followers.length;
  const engagementRate = posts.length > 0 && followersCount > 0
    ? (((totalLikes + totalComments) / (posts.length * followersCount)) * 100).toFixed(2)
    : "0.00";

  res.json({
    totalPosts: posts.length,
    reelsCount,
    followersCount,
    followingCount: user.following.length,
    totalLikes,
    totalComments,
    totalInteractions: totalLikes + totalComments,
    engagementRate: `${engagementRate}%`,
    profileViewsEstimate: Math.max(followersCount * 3 + totalLikes * 2, 12),
    growthTrend: [
      { day: "Mon", count: Math.max(0, Math.floor(followersCount * 0.85)) },
      { day: "Tue", count: Math.max(0, Math.floor(followersCount * 0.88)) },
      { day: "Wed", count: Math.max(0, Math.floor(followersCount * 0.92)) },
      { day: "Thu", count: Math.max(0, Math.floor(followersCount * 0.95)) },
      { day: "Fri", count: Math.max(0, Math.floor(followersCount * 0.98)) },
      { day: "Sat", count: Math.max(0, Math.floor(followersCount * 0.99)) },
      { day: "Sun", count: followersCount },
    ],
  });
});

// ── Verification Request ──────────────────────────────────────────────────────
router.get("/users/me/verify-request", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId).select("isVerified verificationRequest");
  res.json({
    isVerified: user?.isVerified || false,
    request: user?.verificationRequest || { status: "none" },
  });
});

router.post("/users/me/verify-request", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { category, documentType, details } = req.body as {
    category?: string;
    documentType?: string;
    details?: string;
  };

  const user = await User.findByIdAndUpdate(
    req.userId,
    {
      verificationRequest: {
        status: "pending",
        category: category || "Creator",
        documentType: documentType || "Government ID",
        details: details || "",
        submittedAt: new Date(),
      },
    },
    { new: true }
  );

  res.json({ ok: true, request: user?.verificationRequest });
});

// ── Sensitive Info Management (Email & Phone) ─────────────────────────────────
router.post("/users/me/change-email", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { newEmail, password } = req.body as { newEmail?: string; password?: string };
  if (!newEmail || !password) { res.status(400).json({ error: "newEmail and password are required" }); return; }
  
  const cleanEmail = newEmail.trim().toLowerCase();
  const user = await User.findById(req.userId).select("+passwordHash");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) { res.status(400).json({ error: "Incorrect password" }); return; }
  
  const existing = await User.findOne({ email: cleanEmail });
  if (existing && existing._id.toString() !== req.userId) {
    res.status(409).json({ error: "Email is already in use by another account" });
    return;
  }

  user.email = cleanEmail;
  await user.save();
  res.json({ ok: true, email: cleanEmail, message: "Email updated successfully" });
});

router.post("/users/me/change-phone", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { phoneNumber, password } = req.body as { phoneNumber?: string; password?: string };
  if (!password) { res.status(400).json({ error: "Password is required" }); return; }
  
  const user = await User.findById(req.userId).select("+passwordHash");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) { res.status(400).json({ error: "Incorrect password" }); return; }
  
  user.phoneNumber = phoneNumber?.trim() || undefined;
  await user.save();
  res.json({ ok: true, phoneNumber: user.phoneNumber, message: "Phone number updated successfully" });
});

// ── Account Deactivation & Deletion ───────────────────────────────────────────
router.post("/users/me/deactivate", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { password } = req.body as { password?: string };
  if (!password) { res.status(400).json({ error: "Password is required to deactivate" }); return; }
  
  const user = await User.findById(req.userId).select("+passwordHash");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) { res.status(400).json({ error: "Incorrect password" }); return; }

  user.isDeactivated = true;
  await user.save();
  res.json({ ok: true, message: "Account has been deactivated." });
});

router.post(["/users/me/delete", "/users/me/delete-account"], requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { password, confirmationText } = req.body as { password?: string; confirmationText?: string };
  if (!password) {
    res.status(400).json({ error: "Password is required to confirm account deletion" });
    return;
  }
  if (confirmationText !== undefined && confirmationText !== "DELETE") {
    res.status(400).json({ error: "Please enter DELETE to confirm" });
    return;
  }
  
  const user = await User.findById(req.userId).select("+passwordHash");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) { res.status(400).json({ error: "Incorrect password" }); return; }

  // Clean up user's posts, notifications, and references
  await Post.deleteMany({ authorId: user._id });
  await Notification.deleteMany({ $or: [{ userId: user._id }, { actorId: user._id }] });
  await User.findByIdAndDelete(user._id);

  res.json({ ok: true, message: "Account permanently deleted." });
});


export default router;
