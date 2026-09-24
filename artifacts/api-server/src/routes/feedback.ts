import { Router, type IRouter } from "express";
import { Feedback, User, Notification } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { uploadBase64 } from "../lib/cloudinary";
import mongoose from "mongoose";

const router: IRouter = Router();

// Helper to check if a user is an admin or creator
async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await User.findById(userId).select("role username");
  return user?.role === "admin" || user?.role === "creator";
}

// 1. Submit Feedback
router.post("/feedback", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { type, title, description, bugDetails, pageContext, attachments, rating } = req.body;

    if (!title?.trim() || !description?.trim()) {
      res.status(400).json({ error: "Title and description are required" });
      return;
    }

    const validTypes = ["bug", "feature", "ui", "performance", "other"];
    const feedbackType = validTypes.includes(type) ? type : "other";

    const feedback = await Feedback.create({
      userId: req.userId,
      type: feedbackType,
      title: title.trim(),
      description: description.trim(),
      bugDetails: feedbackType === "bug" && bugDetails ? {
        whatHappened: bugDetails.whatHappened?.trim() || null,
        whatExpected: bugDetails.whatExpected?.trim() || null,
        stepsToReproduce: bugDetails.stepsToReproduce?.trim() || null,
        pageContext: bugDetails.pageContext?.trim() || null,
        browserInfo: bugDetails.browserInfo?.trim() || null,
      } : undefined,
      pageContext: pageContext?.trim() || null,
      attachments: Array.isArray(attachments) ? attachments.slice(0, 5) : [],
      rating: typeof rating === "number" && rating >= 1 && rating <= 5 ? rating : undefined,
      status: "submitted",
      adminReplies: [],
    });

    res.status(201).json({
      id: feedback._id.toString(),
      type: feedback.type,
      title: feedback.title,
      description: feedback.description,
      status: feedback.status,
      createdAt: feedback.createdAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to submit feedback" });
  }
});

// 2. Upload Screenshot for Feedback
router.post("/feedback/upload", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { data, mimeType } = req.body as { data?: string; mimeType?: string };
    if (!data || !mimeType) {
      res.status(400).json({ error: "Image data and mimeType are required" });
      return;
    }

    if (!mimeType.startsWith("image/")) {
      res.status(400).json({ error: "Only image files are permitted" });
      return;
    }

    // Check base64 size (approx 10MB max)
    if (data.length > 14 * 1024 * 1024) {
      res.status(400).json({ error: "File size exceeds maximum allowed 10MB" });
      return;
    }

    const uploadRes = await uploadBase64(data, mimeType, "whiterchat/feedback");
    res.json(uploadRes);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Screenshot upload failed" });
  }
});

// 3. Get My Feedback List
router.get("/feedback/mine", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const list = await Feedback.find({ userId: req.userId }).sort({ createdAt: -1 });

    const formatted = list.map((f) => ({
      id: f._id.toString(),
      type: f.type,
      title: f.title,
      description: f.description,
      bugDetails: f.bugDetails,
      pageContext: f.pageContext,
      attachments: f.attachments,
      status: f.status,
      rating: f.rating,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
      repliesCount: (f.adminReplies || []).filter((r) => !r.isInternal).length,
      latestReply: f.adminReplies && f.adminReplies.length > 0
        ? f.adminReplies.filter((r) => !r.isInternal).slice(-1)[0]
        : null,
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch user feedback" });
  }
});

// 4. Get Specific Feedback Detail
router.get("/feedback/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      res.status(404).json({ error: "Feedback not found" });
      return;
    }

    const isAdmin = await isUserAdmin(req.userId!);
    const isOwner = feedback.userId.toString() === req.userId;

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const author = await User.findById(feedback.userId).select("username fullName avatarUrl");

    // Filter replies: non-admins only see non-internal replies
    const replies = (feedback.adminReplies || [])
      .filter((r) => isAdmin || !r.isInternal)
      .map((r) => ({
        adminId: r.adminId?.toString(),
        adminUsername: r.adminUsername,
        text: r.text,
        isInternal: isAdmin ? r.isInternal : false,
        createdAt: r.createdAt.toISOString(),
      }));

    res.json({
      id: feedback._id.toString(),
      userId: feedback.userId.toString(),
      user: author ? {
        username: author.username,
        fullName: author.fullName,
        avatarUrl: author.avatarUrl,
      } : null,
      type: feedback.type,
      title: feedback.title,
      description: feedback.description,
      bugDetails: feedback.bugDetails,
      pageContext: feedback.pageContext,
      attachments: feedback.attachments,
      status: feedback.status,
      rating: feedback.rating,
      adminReplies: replies,
      createdAt: feedback.createdAt.toISOString(),
      updatedAt: feedback.updatedAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get feedback detail" });
  }
});

// 5. Rate Experience on Feedback
router.post("/feedback/:id/rate", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { rating } = req.body;
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
      return;
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      res.status(404).json({ error: "Feedback not found" });
      return;
    }

    if (feedback.userId.toString() !== req.userId) {
      res.status(403).json({ error: "Only the author can rate this feedback" });
      return;
    }

    feedback.rating = rating;
    await feedback.save();

    res.json({ ok: true, rating });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to submit rating" });
  }
});

// 6. ADMIN: List all feedback
router.get("/feedback/admin/all", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const isAdmin = await isUserAdmin(req.userId!);
    if (!isAdmin) {
      res.status(403).json({ error: "Admin authorization required" });
      return;
    }

    const { status, type, q } = req.query as { status?: string; type?: string; q?: string };
    const filter: any = {};

    if (status && status !== "all") {
      filter.status = status;
    }
    if (type && type !== "all") {
      filter.type = type;
    }
    if (q?.trim()) {
      filter.$or = [
        { title: { $regex: q.trim(), $options: "i" } },
        { description: { $regex: q.trim(), $options: "i" } },
      ];
    }

    const list = await Feedback.find(filter).sort({ createdAt: -1 }).limit(100);

    const userIds = [...new Set(list.map((f) => f.userId.toString()))];
    const users = await User.find({ _id: { $in: userIds } }).select("username fullName avatarUrl email");
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const formatted = list.map((f) => {
      const u = userMap.get(f.userId.toString());
      return {
        id: f._id.toString(),
        userId: f.userId.toString(),
        user: u ? {
          username: u.username,
          fullName: u.fullName,
          avatarUrl: u.avatarUrl,
          email: u.email,
        } : null,
        type: f.type,
        title: f.title,
        description: f.description,
        bugDetails: f.bugDetails,
        pageContext: f.pageContext,
        attachments: f.attachments,
        status: f.status,
        rating: f.rating,
        repliesCount: f.adminReplies?.length || 0,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      };
    });

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list admin feedback" });
  }
});

// 7. ADMIN: Change Feedback Status
router.patch("/feedback/admin/:id/status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const isAdmin = await isUserAdmin(req.userId!);
    if (!isAdmin) {
      res.status(403).json({ error: "Admin authorization required" });
      return;
    }

    const { status } = req.body;
    const allowed = ["submitted", "under_review", "in_progress", "resolved", "closed"];
    if (!allowed.includes(status)) {
      res.status(400).json({ error: "Invalid status value" });
      return;
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      res.status(404).json({ error: "Feedback not found" });
      return;
    }

    const previousStatus = feedback.status;
    feedback.status = status;
    await feedback.save();

    // Create Notification for the user
    try {
      const statusLabels: Record<string, string> = {
        under_review: "is now Under Review",
        in_progress: "is In Progress",
        resolved: "has been Resolved",
        closed: "has been Closed",
      };
      const actionText = statusLabels[status] || `status changed to ${status}`;

      await Notification.create({
        userId: feedback.userId,
        actorId: req.userId,
        type: "feedback",
        feedbackId: feedback._id,
        messageText: `Your ${feedback.type} report "${feedback.title}" ${actionText}.`,
      });

      // Emit realtime socket event if io is mounted
      const io = req.app.get("io");
      if (io) {
        io.to(`user:${feedback.userId}`).emit("feedback_updated", {
          feedbackId: feedback._id.toString(),
          title: feedback.title,
          status,
        });
      }
    } catch (nErr) {
      console.warn("Notification creation for feedback failed", nErr);
    }

    res.json({ ok: true, status: feedback.status, previousStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update feedback status" });
  }
});

// 8. ADMIN: Add reply to Feedback
router.post("/feedback/admin/:id/reply", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const isAdmin = await isUserAdmin(req.userId!);
    if (!isAdmin) {
      res.status(403).json({ error: "Admin authorization required" });
      return;
    }

    const { text, isInternal } = req.body;
    if (!text?.trim()) {
      res.status(400).json({ error: "Reply text is required" });
      return;
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      res.status(404).json({ error: "Feedback not found" });
      return;
    }

    const adminUser = await User.findById(req.userId).select("username");
    const replyObj = {
      adminId: new mongoose.Types.ObjectId(req.userId!),
      adminUsername: adminUser?.username || "Admin",
      text: text.trim(),
      isInternal: !!isInternal,
      createdAt: new Date(),
    };

    feedback.adminReplies.push(replyObj);
    await feedback.save();

    // If public reply, notify user
    if (!isInternal) {
      try {
        await Notification.create({
          userId: feedback.userId,
          actorId: req.userId,
          type: "feedback",
          feedbackId: feedback._id,
          messageText: `A moderator replied to your feedback "${feedback.title}".`,
        });

        const io = req.app.get("io");
        if (io) {
          io.to(`user:${feedback.userId}`).emit("feedback_reply", {
            feedbackId: feedback._id.toString(),
            reply: {
              adminUsername: replyObj.adminUsername,
              text: replyObj.text,
              createdAt: replyObj.createdAt.toISOString(),
            },
          });
        }
      } catch (nErr) {
        console.warn("Notification for feedback reply failed", nErr);
      }
    }

    res.status(201).json({
      ok: true,
      reply: {
        adminUsername: replyObj.adminUsername,
        text: replyObj.text,
        isInternal: replyObj.isInternal,
        createdAt: replyObj.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to add reply" });
  }
});

export default router;
