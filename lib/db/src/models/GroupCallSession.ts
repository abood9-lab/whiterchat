import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IGroupCallParticipant {
  userId: mongoose.Types.ObjectId;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  joinedAt: Date;
  leftAt?: Date;
  isMuted?: boolean;
  isCameraOff?: boolean;
}

export interface IGroupCallSession extends Document {
  conversationId: mongoose.Types.ObjectId;
  roomId: string;
  createdBy: mongoose.Types.ObjectId;
  callType: "voice" | "video";
  status: "active" | "ended";
  participants: IGroupCallParticipant[];
  activeParticipantCount: number;
  maxParticipants: number;
  startedAt: Date;
  endedAt?: Date;
  duration: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IGroupCallParticipant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    fullName: { type: String },
    avatarUrl: { type: String },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
    isMuted: { type: Boolean, default: false },
    isCameraOff: { type: Boolean, default: false },
  },
  { _id: false }
);

const GroupCallSessionSchema = new Schema<IGroupCallSession>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    roomId: { type: String, required: true, unique: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    callType: { type: String, enum: ["voice", "video"], default: "voice" },
    status: { type: String, enum: ["active", "ended"], default: "active", index: true },
    participants: [ParticipantSchema],
    activeParticipantCount: { type: Number, default: 0, min: 0, max: 8 },
    maxParticipants: { type: Number, default: 8 },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    duration: { type: Number, default: 0 },
  },
  { timestamps: true }
);

GroupCallSessionSchema.index({ conversationId: 1, status: 1 });

export const GroupCallSession: Model<IGroupCallSession> =
  mongoose.models.GroupCallSession || mongoose.model<IGroupCallSession>("GroupCallSession", GroupCallSessionSchema);
