import mongoose, { Schema, type Document } from "mongoose";

export interface IGroupJoinRequest extends Document {
  _id: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "rejected" | "cancelled";
  message?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GroupJoinRequestSchema = new Schema<IGroupJoinRequest>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    message: { type: String, default: "" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
  },
  { timestamps: true }
);

GroupJoinRequestSchema.index({ groupId: 1, userId: 1 });
GroupJoinRequestSchema.index({ ownerId: 1, status: 1 });
GroupJoinRequestSchema.index({ createdAt: -1 });

export const GroupJoinRequest: mongoose.Model<IGroupJoinRequest> =
  (mongoose.models.GroupJoinRequest as any) ??
  mongoose.model<IGroupJoinRequest>("GroupJoinRequest", GroupJoinRequestSchema);
