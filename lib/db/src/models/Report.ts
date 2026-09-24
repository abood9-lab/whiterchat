import mongoose, { Schema, type Document } from "mongoose";

export interface IReport extends Document {
  _id: mongoose.Types.ObjectId;
  reporterId: mongoose.Types.ObjectId;
  targetType: "user" | "post" | "message" | "comment" | "group";
  targetUserId?: mongoose.Types.ObjectId;
  targetPostId?: mongoose.Types.ObjectId;
  targetMessageId?: mongoose.Types.ObjectId;
  targetCommentId?: mongoose.Types.ObjectId;
  targetConversationId?: mongoose.Types.ObjectId;
  reason: string;
  details?: string;
  status: "pending" | "reviewed" | "resolved" | "rejected";
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: ["user", "post", "message", "comment", "group"], required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    targetPostId: { type: Schema.Types.ObjectId, ref: "Post", default: null },
    targetMessageId: { type: Schema.Types.ObjectId, ref: "Message", default: null },
    targetCommentId: { type: Schema.Types.ObjectId, default: null },
    targetConversationId: { type: Schema.Types.ObjectId, ref: "Conversation", default: null },
    reason: { type: String, required: true },
    details: { type: String, default: null },
    status: { type: String, enum: ["pending", "reviewed", "resolved", "rejected"], default: "pending" },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ReportSchema.index({ reporterId: 1, targetMessageId: 1 }, { unique: true, sparse: true });

export const Report: mongoose.Model<IReport> = (mongoose.models.Report as any) ?? mongoose.model<IReport>("Report", ReportSchema);
