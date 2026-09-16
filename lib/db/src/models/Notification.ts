import mongoose, { Schema, type Document } from "mongoose";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  type: "like" | "post_reaction" | "comment" | "comment_reply" | "comment_reaction" | "mention" | "follow" | "message" | "note_reply" | "share" | "feedback" | "story_reply" | "story_reaction";
  postId?: mongoose.Types.ObjectId;
  commentId?: mongoose.Types.ObjectId;
  commentText?: string;
  reactionEmoji?: string;
  mediaType?: string;
  noteId?: mongoose.Types.ObjectId;
  noteText?: string;
  storyId?: mongoose.Types.ObjectId;
  feedbackId?: mongoose.Types.ObjectId;
  messageText?: string;
  conversationId?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["like", "post_reaction", "comment", "comment_reply", "comment_reaction", "mention", "follow", "message", "note_reply", "share", "feedback", "story_reply", "story_reaction"],
      required: true,
    },
    postId: { type: Schema.Types.ObjectId, ref: "Post", default: null },
    commentId: { type: Schema.Types.ObjectId, default: null },
    commentText: { type: String, default: null },
    reactionEmoji: { type: String, default: null },
    mediaType: { type: String, default: null },
    noteId: { type: Schema.Types.ObjectId, ref: "Note", default: null },
    noteText: { type: String, default: null },
    storyId: { type: Schema.Types.ObjectId, ref: "Story", default: null },
    feedbackId: { type: Schema.Types.ObjectId, ref: "Feedback", default: null },
    messageText: { type: String, default: null },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

export const Notification: mongoose.Model<INotification> = (mongoose.models.Notification as any) ?? mongoose.model<INotification>("Notification", NotificationSchema);
