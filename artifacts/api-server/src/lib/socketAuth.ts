import mongoose from "mongoose";
import { Conversation, User, AudioRoom } from "@workspace/db";

/**
 * Verifies that a user is an active, authorized member of a conversation.
 */
export async function validateConversationMembership(
  conversationId: string,
  userId: string
): Promise<any | null> {
  if (!conversationId || !userId) return null;
  try {
    const conv = await Conversation.findById(conversationId);
    if (!conv) return null;

    if (conv.isGroup) {
      if (conv.isDisabled) return null;
      if (conv.bannedUserIds?.some((id: any) => id.toString() === userId)) {
        return null;
      }
      const isMember = (conv.memberIds ?? []).some((id: any) => id.toString() === userId);
      return isMember ? conv : null;
    }

    const isMember =
      conv.user1Id?.toString() === userId || conv.user2Id?.toString() === userId;
    return isMember ? conv : null;
  } catch {
    return null;
  }
}

/**
 * Verifies that both caller and target are participants in the conversation,
 * and neither user has blocked the other.
 */
export async function validateCallSignaling(
  conversationId: string,
  callerId: string,
  targetUserId: string
): Promise<{ ok: boolean; error?: string; conv?: any }> {
  if (!conversationId || !callerId || !targetUserId) {
    return { ok: false, error: "Missing parameters" };
  }

  if (callerId === targetUserId) {
    return { ok: false, error: "Cannot call self" };
  }

  try {
    const conv = await validateConversationMembership(conversationId, callerId);
    if (!conv) {
      return { ok: false, error: "Caller is not a member of this conversation" };
    }

    // Verify target user is in the conversation
    if (conv.isGroup) {
      const isTargetMember = (conv.memberIds ?? []).some((id: any) => id.toString() === targetUserId);
      if (!isTargetMember) {
        return { ok: false, error: "Target is not a member of this group" };
      }
    } else {
      const isTargetMember =
        conv.user1Id?.toString() === targetUserId || conv.user2Id?.toString() === targetUserId;
      if (!isTargetMember) {
        return { ok: false, error: "Target is not a participant in this conversation" };
      }
    }

    // Check block list between both users
    const [callerUser, targetUser] = await Promise.all([
      User.findById(callerId).select("blockedUsers"),
      User.findById(targetUserId).select("blockedUsers"),
    ]);

    const callerBlocked = (callerUser?.blockedUsers ?? []).some(
      (id: any) => id.toString() === targetUserId
    );
    const targetBlocked = (targetUser?.blockedUsers ?? []).some(
      (id: any) => id.toString() === callerId
    );

    if (callerBlocked || targetBlocked) {
      return { ok: false, error: "Communication blocked between users" };
    }

    return { ok: true, conv };
  } catch {
    return { ok: false, error: "Authorization lookup failed" };
  }
}

/**
 * Validates audio room participant and returns their authoritative role.
 */
export async function validateAudioRoomParticipant(
  roomId: string,
  userId: string
): Promise<{ ok: boolean; room?: any; role?: "host" | "co-host" | "speaker" | "listener" }> {
  if (!roomId || !userId) return { ok: false };
  try {
    const room = await AudioRoom.findOne({ roomId });
    if (!room || room.status === "ended") return { ok: false };

    // If conversation-scoped room, check conversation membership
    if (room.conversationId) {
      const conv = await validateConversationMembership(room.conversationId.toString(), userId);
      if (!conv) return { ok: false };
    }

    // Authoritative role calculation
    let role: "host" | "co-host" | "speaker" | "listener" = "listener";
    if (room.hostId.toString() === userId) {
      role = "host";
    } else if (room.coHostIds?.some((id: any) => id.toString() === userId)) {
      role = "co-host";
    } else if (room.speakerIds?.some((id: any) => id.toString() === userId)) {
      role = "speaker";
    }

    return { ok: true, room, role };
  } catch {
    return { ok: false };
  }
}

/**
 * Verifies host or co-host authority in an audio room.
 */
export async function validateAudioRoomModerator(
  roomId: string,
  userId: string
): Promise<{ ok: boolean; room?: any; isHost?: boolean }> {
  if (!roomId || !userId) return { ok: false };
  try {
    const room = await AudioRoom.findOne({ roomId });
    if (!room || room.status === "ended") return { ok: false };

    const isHost = room.hostId.toString() === userId;
    const isCoHost = (room.coHostIds ?? []).some((id: any) => id.toString() === userId);

    if (!isHost && !isCoHost) {
      return { ok: false };
    }

    return { ok: true, room, isHost };
  } catch {
    return { ok: false };
  }
}
