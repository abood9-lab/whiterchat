import { Router, type IRouter } from "express";
import { AudioRoom, User, Conversation } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";
import mongoose from "mongoose";
import type { Server as SocketServer } from "socket.io";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getIo(req: AuthRequest): SocketServer | undefined {
  return (req as any).app.get("io");
}

// ── 1. Create or Hydrate Audio Room on Space Startup ────────────────────────
router.post("/audio-rooms", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const {
      id,
      title,
      description,
      category,
      topic,
      visibility,
      groupId,
      groupName,
    } = req.body;

    if (!id || !title) {
      res.status(400).json({ error: "Missing space id or title" });
      return;
    }

    const meId = req.userId!;
    const me = await User.findById(meId);
    if (!me) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Verify group permissions if group-only
    if (visibility === "group" && groupId) {
      const conv = await Conversation.findById(groupId);
      if (!conv) {
        res.status(404).json({ error: "Group conversation not found" });
        return;
      }
      const isMember = (conv.memberIds ?? []).some((uid: any) => uid.toString() === meId);
      if (!isMember) {
        res.status(403).json({ error: "You are not a member of this group" });
        return;
      }
    }

    // Check if space already exists
    let room = await AudioRoom.findOne({ roomId: id });
    if (room) {
      if (room.status !== "ended") {
        res.status(200).json(room);
        return;
      }
      // Re-activate room
      room.status = "live";
      room.title = title;
      room.description = description;
      room.category = category || "chat";
      room.topic = topic;
      room.visibility = visibility || "public";
      room.groupId = groupId ? new mongoose.Types.ObjectId(groupId) : undefined;
      room.groupName = groupName;
      room.participants = [
        {
          userId: me._id,
          username: me.username,
          fullName: me.fullName || undefined,
          avatarUrl: me.avatarUrl || undefined,
          activeDecorationId: me.activeDecorationId || undefined,
          role: "host",
          isMuted: false,
          isHandRaised: false,
          joinedAt: new Date(),
        },
      ];
      room.speakerIds = [me._id];
      room.coHostIds = [];
      room.listenerCount = 0;
      room.startedAt = new Date();
      room.endedAt = undefined;
      await room.save();
    } else {
      // Create new space
      room = await AudioRoom.create({
        roomId: id,
        title,
        description,
        category: category || "chat",
        topic,
        visibility: visibility || "public",
        groupId: groupId ? new mongoose.Types.ObjectId(groupId) : undefined,
        groupName,
        hostId: me._id,
        coHostIds: [],
        speakerIds: [me._id],
        maxSpeakers: 8,
        maxListeners: 500,
        listenerCount: 0,
        status: "live",
        startedAt: new Date(),
        participants: [
          {
            userId: me._id,
            username: me.username,
            fullName: me.fullName || undefined,
            avatarUrl: me.avatarUrl || undefined,
            activeDecorationId: me.activeDecorationId || undefined,
            role: "host",
            isMuted: false,
            isHandRaised: false,
            joinedAt: new Date(),
          },
        ],
      });
    }

    // Global Socket Broadcast about new space
    const io = getIo(req);
    if (io) {
      io.emit("audio_room_created", {
        id: room.roomId,
        title: room.title,
        description: room.description,
        category: room.category,
        visibility: room.visibility,
        hostUser: {
          id: me._id.toString(),
          username: me.username,
          fullName: me.fullName,
          avatarUrl: me.avatarUrl,
        },
        listenerCount: 0,
        createdAt: room.createdAt,
      });
    }

    res.status(201).json(room);
  } catch (err: any) {
    logger.error({ err }, "Error starting audio space");
    res.status(500).json({ error: "Failed to create audio room" });
  }
});

// ── 2. Get All Active Live Audio Rooms ──────────────────────────────────────
router.get("/audio-rooms", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const meId = req.userId!;
    
    // Find live spaces
    const query: any = { status: "live" };
    
    // Fetch user groups to filter group-only spaces
    const myGroups = await Conversation.find({
      isGroup: true,
      memberIds: new mongoose.Types.ObjectId(meId),
      isDisabled: { $ne: true },
    }).select("_id");
    
    const myGroupIds = myGroups.map(g => g._id.toString());
    
    // Filter rooms: user must be able to see "public" spaces, OR group-only spaces if they are a member
    query.$or = [
      { visibility: "public" },
      { visibility: "group", groupId: { $in: myGroupIds.map(id => new mongoose.Types.ObjectId(id)) } }
    ];

    const rooms = await AudioRoom.find(query)
      .sort({ startedAt: -1 })
      .populate("hostId", "username fullName avatarUrl activeDecorationId isVerified");

    // Map to response format
    const formattedRooms = rooms.map(room => {
      const host: any = room.hostId;
      return {
        id: room.roomId,
        title: room.title,
        description: room.description,
        category: room.category,
        topic: room.topic,
        visibility: room.visibility,
        groupId: room.groupId?.toString() || null,
        groupName: room.groupName,
        hostId: room.hostId instanceof mongoose.Types.ObjectId ? room.hostId.toString() : host?._id?.toString(),
        hostUser: host ? {
          id: host._id?.toString(),
          username: host.username,
          fullName: host.fullName,
          avatarUrl: host.avatarUrl,
          activeDecorationId: host.activeDecorationId,
          isVerified: host.isVerified,
        } : {
          id: room.hostId.toString(),
          username: "Unknown",
        },
        coHostIds: room.coHostIds.map(id => id.toString()),
        speakerIds: room.speakerIds.map(id => id.toString()),
        maxSpeakers: room.maxSpeakers,
        maxListeners: room.maxListeners,
        listenerCount: room.listenerCount,
        status: room.status,
        createdAt: room.createdAt.toISOString(),
        startedAt: room.startedAt.toISOString(),
      };
    });

    res.json(formattedRooms);
  } catch (err: any) {
    logger.error({ err }, "Error listing audio spaces");
    res.status(500).json({ error: "Failed to list audio spaces" });
  }
});

// ── 3. Get Single Active Audio Room Details ──────────────────────────────────
router.get("/audio-rooms/:roomId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { roomId } = req.params;
    const meId = req.userId!;

    const room = await AudioRoom.findOne({ roomId });
    if (!room) {
      res.status(404).json({ error: "Audio space not found" });
      return;
    }

    if (room.status === "ended") {
      res.status(410).json({ error: "This audio space has already ended" });
      return;
    }

    // Verify visibility/permissions if group
    if (room.visibility === "group" && room.groupId) {
      const conv = await Conversation.findById(room.groupId);
      if (!conv) {
        res.status(404).json({ error: "Associated group conversation not found" });
        return;
      }
      const isMember = (conv.memberIds ?? []).some((uid: any) => uid.toString() === meId);
      if (!isMember) {
        res.status(403).json({ error: "Unauthorized access to group audio room" });
        return;
      }
    }

    // Hydrate host details
    const host = await User.findById(room.hostId).select("username fullName avatarUrl activeDecorationId isVerified");

    const formatted = {
      id: room.roomId,
      title: room.title,
      description: room.description,
      category: room.category,
      topic: room.topic,
      visibility: room.visibility,
      groupId: room.groupId?.toString() || null,
      groupName: room.groupName,
      hostId: room.hostId.toString(),
      hostUser: host ? {
        id: host._id.toString(),
        username: host.username,
        fullName: host.fullName || host.username,
        avatarUrl: host.avatarUrl,
        activeDecorationId: host.activeDecorationId,
        isVerified: host.isVerified,
      } : {
        id: room.hostId.toString(),
        username: "Unknown",
      },
      coHostIds: room.coHostIds.map(id => id.toString()),
      speakerIds: room.speakerIds.map(id => id.toString()),
      maxSpeakers: room.maxSpeakers,
      maxListeners: room.maxListeners,
      listenerCount: room.listenerCount,
      status: room.status,
      createdAt: room.createdAt.toISOString(),
      startedAt: room.startedAt.toISOString(),
    };

    res.json(formatted);
  } catch (err: any) {
    logger.error({ err }, "Error loading audio room");
    res.status(500).json({ error: "Failed to load audio room" });
  }
});

// ── 4. Leave Audio Room ──────────────────────────────────────────────────────
router.post("/audio-rooms/:roomId/leave", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { roomId } = req.params;
    const meId = req.userId!;

    const room = await AudioRoom.findOne({ roomId });
    if (!room) {
      res.json({ success: true, message: "Room already closed or not found" });
      return;
    }

    const isHost = room.hostId.toString() === meId;

    // Update participant's left status
    const pIdx = room.participants.findIndex(p => p.userId.toString() === meId && !p.leftAt);
    if (pIdx >= 0) {
      room.participants[pIdx].leftAt = new Date();
    }

    // Remove from active speakers/co-hosts if relevant
    room.speakerIds = room.speakerIds.filter(id => id.toString() !== meId);
    room.coHostIds = room.coHostIds.filter(id => id.toString() !== meId);

    // Recalculate active participants
    const activeParticipants = room.participants.filter(p => !p.leftAt);

    // If host left or no active participants remain, end the audio space completely
    if (isHost || activeParticipants.length === 0) {
      room.status = "ended";
      room.endedAt = new Date();
      room.listenerCount = 0;
      room.participants.forEach(p => {
        if (!p.leftAt) p.leftAt = new Date();
      });
      await room.save();

      const io = getIo(req);
      if (io) {
        io.emit("audio_room_ended", { roomId });
        io.to(`audio_room:${roomId}`).emit("audio_room_ended", { roomId });
      }

      res.json({ success: true, ended: true, message: "Audio space ended" });
      return;
    }

    const activeSpeakers = [room.hostId.toString(), ...room.coHostIds.map(id => id.toString()), ...room.speakerIds.map(id => id.toString())];
    const activeListeners = activeParticipants.filter(p => !activeSpeakers.includes(p.userId.toString()));
    room.listenerCount = Math.max(0, activeListeners.length);

    await room.save();

    res.json({ success: true, listenerCount: room.listenerCount });
  } catch (err: any) {
    logger.error({ err }, "Error leaving space");
    res.status(500).json({ error: "Failed to register leave event" });
  }
});

// ── 5. End Audio Room (Host Only) ───────────────────────────────────────────
router.post("/audio-rooms/:roomId/end", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { roomId } = req.params;
    const meId = req.userId!;

    const room = await AudioRoom.findOne({ roomId });
    if (!room) {
      res.status(404).json({ error: "Audio room not found" });
      return;
    }

    if (room.hostId.toString() !== meId) {
      res.status(403).json({ error: "Only the host can end the audio space" });
      return;
    }

    if (room.status !== "ended") {
      room.status = "ended";
      room.endedAt = new Date();
      room.listenerCount = 0;
      room.participants.forEach(p => {
        if (!p.leftAt) p.leftAt = new Date();
      });
      await room.save();

      // Trigger socket event (global broadcast & room broadcast)
      const io = getIo(req);
      if (io) {
        io.emit("audio_room_ended", { roomId });
        io.to(`audio_room:${roomId}`).emit("audio_room_ended", { roomId });
      }
    }

    res.json({ success: true, message: "Audio space ended" });
  } catch (err: any) {
    logger.error({ err }, "Error ending audio space");
    res.status(500).json({ error: "Failed to end audio space" });
  }
});

export default router;
