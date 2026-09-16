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
  groupDescription?: string | null;
  memberIds: mongoose.Types.ObjectId[];
  adminIds: mongoose.Types.ObjectId[];
  createdBy?: mongoose.Types.ObjectId;
  onlyAdminsCanSend: boolean;
  // Shared
  isArchivedBy: mongoose.Types.ObjectId[];
  isMutedBy: mongoose.Types.ObjectId[];
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
    groupDescription: { type: String, default: null },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    adminIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    onlyAdminsCanSend: { type: Boolean, default: false },
    isArchivedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isMutedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
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
