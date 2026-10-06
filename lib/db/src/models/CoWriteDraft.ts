import mongoose, { Schema, type Document } from "mongoose";

export interface ICoWriteApproval {
  userId: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "rejected";
  reason?: string | null;
  updatedAt: Date;
}

export interface ICoWriteOperation {
  operationId: string;
  userId: mongoose.Types.ObjectId;
  sequence: number;
  type: "insert" | "delete" | "replace" | "set_text";
  position?: number;
  text?: string;
  length?: number;
  timestamp: Date;
}

export interface ICoWriteDraft extends Document {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  participantIds: mongoose.Types.ObjectId[];
  title?: string;
  content: string;
  version: number;
  status: "drafting" | "review" | "locked" | "sent" | "cancelled" | "expired";
  approvals: ICoWriteApproval[];
  operations: ICoWriteOperation[];
  finalMessageId?: mongoose.Types.ObjectId | null;
  expiresAt?: Date | null;
  lockedAt?: Date | null;
  sentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CoWriteApprovalSchema = new Schema<ICoWriteApproval>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reason: { type: String, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CoWriteOperationSchema = new Schema<ICoWriteOperation>(
  {
    operationId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sequence: { type: Number, required: true },
    type: { type: String, enum: ["insert", "delete", "replace", "set_text"], required: true },
    position: { type: Number },
    text: { type: String },
    length: { type: Number },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CoWriteDraftSchema = new Schema<ICoWriteDraft>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    participantIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    title: { type: String, default: null },
    content: { type: String, default: "" },
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["drafting", "review", "locked", "sent", "cancelled", "expired"],
      default: "drafting",
      index: true,
    },
    approvals: [CoWriteApprovalSchema],
    operations: [CoWriteOperationSchema],
    finalMessageId: { type: Schema.Types.ObjectId, ref: "Message", default: null },
    expiresAt: { type: Date, default: null, index: true },
    lockedAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

CoWriteDraftSchema.index({ conversationId: 1, status: 1 });
CoWriteDraftSchema.index({ participantIds: 1, status: 1 });

export const CoWriteDraft: mongoose.Model<ICoWriteDraft> =
  (mongoose.models.CoWriteDraft as any) ?? mongoose.model<ICoWriteDraft>("CoWriteDraft", CoWriteDraftSchema);
