import mongoose from "mongoose";

export interface INoteLocation {
  name: string;
  lat?: number;
  lng?: number;
}

export interface INote {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  text?: string;
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
  location?: INoteLocation | null;
  audience?: "followers" | "close_friends";
  theme?: "default" | "green" | "blue" | "purple" | "pink" | "orange" | "red" | "dark";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NoteLocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    lat:  { type: Number },
    lng:  { type: Number },
  },
  { _id: false }
);

const NoteSchema = new mongoose.Schema(
  {
    userId:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    text:          { type: String, maxlength: 100, default: "" },
    emoji:         { type: String, default: null },
    gifUrl:        { type: String, default: null },
    sticker:       { type: String, default: null },
    voiceUrl:      { type: String, default: null },
    voiceDuration: { type: Number, default: null },
    imageUrl:      { type: String, default: null },
    spotifyTrack:  { type: mongoose.Schema.Types.Mixed, default: null },
    location:      { type: NoteLocationSchema, default: null },
    audience:      { type: String, enum: ["followers", "close_friends"], default: "followers" },
    theme:         { type: String, enum: ["default", "green", "blue", "purple", "pink", "orange", "red", "dark"], default: "default" },
    expiresAt:     { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL: MongoDB will auto-delete documents once expiresAt is reached
NoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Note: mongoose.Model<INote> = (mongoose.models.Note as any) ?? mongoose.model<INote>("Note", NoteSchema);
