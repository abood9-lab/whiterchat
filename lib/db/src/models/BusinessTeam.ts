import mongoose, { Schema, type Document } from "mongoose";

export interface IBusinessTeamMember extends Document {
  _id: mongoose.Types.ObjectId;
  businessOwnerId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  email: string;
  name?: string;
  role: "owner" | "admin" | "editor" | "moderator";
  status: "pending" | "accepted" | "declined";
  invitedAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessTeamMemberSchema = new Schema<IBusinessTeamMember>(
  {
    businessOwnerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, default: null },
    role: {
      type: String,
      enum: ["owner", "admin", "editor", "moderator"],
      default: "editor",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
    invitedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

BusinessTeamMemberSchema.index({ businessOwnerId: 1, email: 1 }, { unique: true });

export const BusinessTeamMember: mongoose.Model<IBusinessTeamMember> =
  (mongoose.models.BusinessTeamMember as any) ??
  mongoose.model<IBusinessTeamMember>("BusinessTeamMember", BusinessTeamMemberSchema);
