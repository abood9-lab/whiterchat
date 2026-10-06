import mongoose, { Schema, type Document } from "mongoose";

export interface ITimeoutEntry {
  userId: mongoose.Types.ObjectId;
  until: Date;
}

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  // 1-to-1 participants (null for groups)
  user1Id?: mongoose.Types.ObjectId;
  user2Id?: mongoose.Types.ObjectId;
  // Group fields
  isGroup: boolean;
  groupName?: string;
  groupAvatarUrl?: string | null;
  groupCoverUrl?: string | null;
  groupDescription?: string | null;
  privacy?: "public" | "approval_required" | "private";
  memberIds: mongoose.Types.ObjectId[];
  adminIds: mongoose.Types.ObjectId[];
  moderatorIds?: mongoose.Types.ObjectId[];
  bannedUserIds?: mongoose.Types.ObjectId[];
  createdBy?: mongoose.Types.ObjectId;
  onlyAdminsCanSend: boolean;
  isDisabled?: boolean;
  disabledReason?: string;
  disabledAt?: Date;
  disabledBy?: mongoose.Types.ObjectId;
  // Shared
  isArchivedBy: mongoose.Types.ObjectId[];
  isMutedBy: mongoose.Types.ObjectId[];
  isPinnedBy?: mongoose.Types.ObjectId[];
  theme?: string;
  lastActivityAt: Date;
  disappearAfter: string | null;
  timeoutEntries: ITimeoutEntry[];
  createdAt: Date;
}

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  messageType?: string;
  postId?: mongoose.Types.ObjectId;
  reelId?: mongoose.Types.ObjectId;
  sharedPost?: {
    id: string;
    mediaUrl?: string;
    mediaType?: string;
    caption?: string;
    creatorUsername?: string;
    creatorAvatar?: string;
  } | null;
  sharedReel?: {
    id: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    caption?: string;
    creatorUsername?: string;
    creatorAvatar?: string;
  } | null;
  spotifyTrack?: {
    trackId: string;
    title: string;
    artist: string;
    album?: string;
    coverUrl?: string;
    previewUrl?: string;
    spotifyUrl?: string;
  } | null;
  callLog?: {
    callType: "voice" | "video";
    duration: number;
    status: "completed" | "missed" | "declined" | "failed";
  } | null;
  gifInfo?: {
    gifId: string;
    url: string;
    previewUrl?: string;
    width?: number;
    height?: number;
    title?: string;
  } | null;
  stickerInfo?: {
    stickerId: string;
    url: string;
    previewUrl?: string;
    title?: string;
  } | null;
  locationInfo?: {
    name: string;
    address?: string;
    lat: number;
    lng: number;
  } | null;
  isRead: boolean;
  readBy: mongoose.Types.ObjectId[]; // group read receipts
  replyToId?: mongoose.Types.ObjectId;
  isEdited: boolean;
  isDeleted: boolean;
  isForwarded: boolean;
  reactions: Record<string, mongoose.Types.ObjectId[]>;
  isPinned: boolean;
  starredBy: mongoose.Types.ObjectId[];
  clientId?: string;
  isSnap: boolean;
  viewOnce: boolean;
  viewsLeft: number | null;
  viewedBy: mongoose.Types.ObjectId[];
  pollId?: mongoose.Types.ObjectId;
  gameId?: mongoose.Types.ObjectId;
  whiteboardId?: mongoose.Types.ObjectId;
  puzzle?: {
    type: "secret_question" | "riddle_math" | "memory_challenge";
    question: string;
    hint?: string | null;
    solutionHash: string;
    encryptedPayload: string;
    maxAttempts: number;
    attemptsUsed: number;
    expiresAt?: Date | null;
    revealPolicy: "permanent" | "reveal_once" | "disappear_after_read";
    solvedAt?: Date | null;
    solvedBy?: mongoose.Types.ObjectId[];
    memoryCards?: string[];
    failedUserAttempts?: {
      userId: mongoose.Types.ObjectId;
      attempts: number;
      lastAttemptAt: Date;
    }[];
  } | null;
  permissionGated?: {
    encryptedPayload: string;
    previewNote?: string | null;
    allowReopening: boolean;
    expiresAt?: Date | null;
    grants: {
      userId: mongoose.Types.ObjectId;
      grantType: "one_time" | "1h" | "24h" | "permanent";
      status: "approved" | "declined" | "revoked" | "expired";
      requestedAt: Date;
      decidedAt?: Date | null;
      openedAt?: Date | null;
      expiresAt?: Date | null;
      consumed: boolean;
    }[];
  } | null;
  selectiveVisibility?: {
    mode: "all" | "allow_list" | "deny_list";
    allowedUserIds?: mongoose.Types.ObjectId[];
    deniedUserIds?: mongoose.Types.ObjectId[];
    isSilent: boolean;
    updatedAt?: Date;
  } | null;
  coWrite?: {
    draftId?: mongoose.Types.ObjectId;
    authorIds: mongoose.Types.ObjectId[];
    authorUsernames: string[];
  } | null;
  replyToNote?: {
    noteId?: mongoose.Types.ObjectId;
    text?: string | null;
    emoji?: string | null;
    gifUrl?: string | null;
    sticker?: string | null;
    voiceUrl?: string | null;
    voiceDuration?: number | null;
    imageUrl?: string | null;
    spotifyTrack?: {
      trackId: string;
      title: string;
      artist: string;
      album?: string;
      coverUrl?: string;
      previewUrl?: string;
      spotifyUrl?: string;
    } | null;
    location?: { name: string; lat?: number; lng?: number } | null;
    theme?: string | null;
    authorUsername?: string | null;
    isExpired?: boolean;
  } | null;
  replyToStory?: {
    storyId?: mongoose.Types.ObjectId;
    mediaUrl?: string | null;
    caption?: string | null;
    authorUsername?: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    user1Id: { type: Schema.Types.ObjectId, ref: "User", default: null },
    user2Id: { type: Schema.Types.ObjectId, ref: "User", default: null },
    isGroup: { type: Boolean, default: false },
    groupName: { type: String, default: null },
    groupAvatarUrl: { type: String, default: null },
    groupCoverUrl: { type: String, default: null },
    groupDescription: { type: String, default: null },
    privacy: { type: String, enum: ["public", "approval_required", "private"], default: "approval_required" },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    adminIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    moderatorIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    bannedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    onlyAdminsCanSend: { type: Boolean, default: false },
    isDisabled: { type: Boolean, default: false },
    disabledReason: { type: String, default: null },
    disabledAt: { type: Date, default: null },
    disabledBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    isArchivedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isMutedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isPinnedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    theme: { type: String, default: "default" },
    lastActivityAt: { type: Date, default: Date.now },
    disappearAfter: { type: String, default: null },
    timeoutEntries: [{
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      until: { type: Date, required: true },
    }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: null },
    mediaUrl: { type: String, default: null },
    mediaType: { type: String, default: null },
    fileName: { type: String, default: null },
    messageType: { type: String, default: "text" },
    postId: { type: Schema.Types.ObjectId, ref: "Post", default: null },
    reelId: { type: Schema.Types.ObjectId, ref: "Post", default: null },
    sharedPost: { type: Schema.Types.Mixed, default: null },
    sharedReel: { type: Schema.Types.Mixed, default: null },
    spotifyTrack: { type: Schema.Types.Mixed, default: null },
    callLog: { type: Schema.Types.Mixed, default: null },
    gifInfo: { type: Schema.Types.Mixed, default: null },
    stickerInfo: { type: Schema.Types.Mixed, default: null },
    locationInfo: { type: Schema.Types.Mixed, default: null },
    isRead: { type: Boolean, default: false },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    replyToId: { type: Schema.Types.ObjectId, ref: "Message", default: null },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isForwarded: { type: Boolean, default: false },
    reactions: { type: Map, of: [Schema.Types.ObjectId], default: {} },
    isPinned: { type: Boolean, default: false },
    starredBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    clientId: { type: String, default: null },
    isSnap: { type: Boolean, default: false },
    viewOnce: { type: Boolean, default: false },
    viewsLeft: { type: Number, default: null },
    viewedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    pollId: { type: Schema.Types.ObjectId, ref: "Poll", default: null },
    gameId: { type: Schema.Types.ObjectId, ref: "GameSession", default: null },
    whiteboardId: { type: Schema.Types.ObjectId, ref: "Whiteboard", default: null },
    puzzle: {
      type: { type: String, enum: ["secret_question", "riddle_math", "memory_challenge"] },
      question: { type: String },
      hint: { type: String, default: null },
      solutionHash: { type: String },
      encryptedPayload: { type: String },
      maxAttempts: { type: Number, default: 3 },
      attemptsUsed: { type: Number, default: 0 },
      expiresAt: { type: Date, default: null },
      revealPolicy: { type: String, enum: ["permanent", "reveal_once", "disappear_after_read"], default: "permanent" },
      solvedAt: { type: Date, default: null },
      solvedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
      memoryCards: [{ type: String }],
      failedUserAttempts: [{
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        attempts: { type: Number, default: 0 },
        lastAttemptAt: { type: Date, default: Date.now },
      }],
    },
    permissionGated: {
      encryptedPayload: { type: String },
      previewNote: { type: String, default: null },
      allowReopening: { type: Boolean, default: true },
      expiresAt: { type: Date, default: null },
      grants: [{
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        grantType: { type: String, enum: ["one_time", "1h", "24h", "permanent"], default: "one_time" },
        status: { type: String, enum: ["approved", "declined", "revoked", "expired"], default: "approved" },
        requestedAt: { type: Date, default: Date.now },
        decidedAt: { type: Date, default: null },
        openedAt: { type: Date, default: null },
        expiresAt: { type: Date, default: null },
        consumed: { type: Boolean, default: false },
      }],
    },
    selectiveVisibility: {
      mode: { type: String, enum: ["all", "allow_list", "deny_list"], default: "all" },
      allowedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
      deniedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
      isSilent: { type: Boolean, default: true },
      updatedAt: { type: Date, default: Date.now },
    },
    coWrite: {
      draftId: { type: Schema.Types.ObjectId, ref: "CoWriteDraft", default: null },
      authorIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
      authorUsernames: [{ type: String }],
    },
    replyToNote: { type: Schema.Types.Mixed, default: null },
    replyToStory: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

ConversationSchema.index({ user1Id: 1, lastActivityAt: -1 });
ConversationSchema.index({ user2Id: 1, lastActivityAt: -1 });
ConversationSchema.index({ memberIds: 1, lastActivityAt: -1 });

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, isRead: 1 });

export const Conversation: mongoose.Model<IConversation> = (mongoose.models.Conversation as any) ?? mongoose.model<IConversation>("Conversation", ConversationSchema);
export const Message: mongoose.Model<IMessage> = (mongoose.models.Message as any) ?? mongoose.model<IMessage>("Message", MessageSchema);
