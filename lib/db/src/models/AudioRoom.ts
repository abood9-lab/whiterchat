import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IAudioRoomParticipant {
  userId: mongoose.Types.ObjectId;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  activeDecorationId?: string;
  role: "host" | "co-host" | "speaker" | "listener";
  isMuted: boolean;
  isHandRaised: boolean;
  joinedAt: Date;
  leftAt?: Date;
}

export interface IAudioRoom extends Document {
  roomId: string; // space-xxx
  title: string;
  description?: string;
  category: string;
  topic?: string;
  visibility: "public" | "group";
  groupId?: mongoose.Types.ObjectId;
  groupName?: string;
  hostId: mongoose.Types.ObjectId;
  coHostIds: mongoose.Types.ObjectId[];
  speakerIds: mongoose.Types.ObjectId[];
  maxSpeakers: number;
  maxListeners: number;
  listenerCount: number;
  status: "starting" | "live" | "ending" | "ended";
  participants: IAudioRoomParticipant[];
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IAudioRoomParticipant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    fullName: { type: String },
    avatarUrl: { type: String },
    activeDecorationId: { type: String },
    role: { type: String, enum: ["host", "co-host", "speaker", "listener"], default: "listener" },
    isMuted: { type: Boolean, default: false },
    isHandRaised: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
  },
  { _id: false }
);

const AudioRoomSchema = new Schema<IAudioRoom>(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true, default: "chat" },
    topic: { type: String },
    visibility: { type: String, enum: ["public", "group"], default: "public", index: true },
    groupId: { type: Schema.Types.ObjectId, ref: "Conversation" },
    groupName: { type: String },
    hostId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    coHostIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    speakerIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    maxSpeakers: { type: Number, default: 8 },
    maxListeners: { type: Number, default: 500 },
    listenerCount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["starting", "live", "ending", "ended"], default: "live", index: true },
    participants: [ParticipantSchema],
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

AudioRoomSchema.index({ status: 1, visibility: 1 });

export const AudioRoom: Model<IAudioRoom> =
  mongoose.models.AudioRoom || mongoose.model<IAudioRoom>("AudioRoom", AudioRoomSchema);
