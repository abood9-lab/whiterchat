import mongoose, { Schema, type Document } from "mongoose";

export interface IReaction {
  userId: mongoose.Types.ObjectId;
  emoji: string;
  createdAt: Date;
}

export interface IComment {
  _id: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  text?: string;
  parentId?: mongoose.Types.ObjectId;
  mediaType?: "image" | "gif" | "sticker" | "voice" | null;
  mediaUrl?: string | null;
  voiceDuration?: number | null;
  likes: mongoose.Types.ObjectId[];
  reactions: IReaction[];
  isEdited?: boolean;
  isDeleted?: boolean;
  mentions?: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface IPost extends Document {
  _id: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  caption?: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  thumbnailUrl?: string | null;
  duration?: number | null;
  audioTitle?: string | null;
  audioArtist?: string | null;
  hashtags?: string[];
  mentions?: string[];
  viewsCount?: number;
  views?: mongoose.Types.ObjectId[];
  sharesCount?: number;
  isReel?: boolean;
  audience: "everyone" | "close_friends";
  location?: string;
  altText?: string;
  commentsDisabled: boolean;
  additionalMediaUrls: string[];
  likes: mongoose.Types.ObjectId[];
  reactions: IReaction[];
  saves: mongoose.Types.ObjectId[];
  reposts?: mongoose.Types.ObjectId[];
  comments: IComment[];
  createdAt: Date;
  updatedAt: Date;
}

const ReactionSchema = new Schema<IReaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, default: "❤️" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CommentSchema = new Schema<IComment>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    parentId: { type: Schema.Types.ObjectId, default: null },
    mediaType: { type: String, enum: ["image", "gif", "sticker", "voice", null], default: null },
    mediaUrl: { type: String, default: null },
    voiceDuration: { type: Number, default: null },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    reactions: [ReactionSchema],
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    mentions: [{ type: String }],
  },
  { timestamps: true }
);

const PostSchema = new Schema<IPost>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    caption: { type: String, default: null },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ["image", "video"], default: "image" },
    thumbnailUrl: { type: String, default: null },
    duration: { type: Number, default: null },
    audioTitle: { type: String, default: null },
    audioArtist: { type: String, default: null },
    hashtags: [{ type: String }],
    mentions: [{ type: String }],
    viewsCount: { type: Number, default: 0 },
    views: [{ type: Schema.Types.ObjectId, ref: "User" }],
    sharesCount: { type: Number, default: 0 },
    isReel: { type: Boolean, default: false },
    audience: { type: String, enum: ["everyone", "close_friends"], default: "everyone" },
    location: { type: String, default: null },
    altText: { type: String, default: null },
    commentsDisabled: { type: Boolean, default: false },
    additionalMediaUrls: [{ type: String }],
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    reactions: [ReactionSchema],
    saves: [{ type: Schema.Types.ObjectId, ref: "User" }],
    reposts: [{ type: Schema.Types.ObjectId, ref: "User" }],
    comments: [CommentSchema],
  },
  { timestamps: true }
);

PostSchema.index({ authorId: 1, createdAt: -1 });
PostSchema.index({ isReel: 1, createdAt: -1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ hashtags: 1 });
PostSchema.index({ saves: 1 });
PostSchema.index({ likes: 1 });
PostSchema.index({ "reactions.userId": 1 });

export const Post: mongoose.Model<IPost> = (mongoose.models.Post as any) ?? mongoose.model<IPost>("Post", PostSchema);
