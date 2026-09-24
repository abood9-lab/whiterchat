import mongoose, { Schema, type Document } from "mongoose";

export interface IAiAttachment {
  name: string;
  type: string; // "image" | "file" | "code" | "pdf"
  url?: string;
  mimeType?: string;
  size?: number;
  dataUrl?: string; // inline base64 if small
}

export interface IAiConversation extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  isPinned: boolean;
  systemPrompt?: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiMessage extends Document {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: "user" | "assistant" | "system";
  content: string;
  aiModel?: string;
  attachments?: IAiAttachment[];
  sources?: Array<{ title: string; url: string; snippet?: string }>;
  status?: "sending" | "complete" | "error";
  createdAt: Date;
}

export interface IAiMemory extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  key: string;
  value: string;
  category?: string; // "preference" | "fact" | "topic" | "profile"
  createdAt: Date;
  updatedAt: Date;
}

const AiConversationSchema = new Schema<IAiConversation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, default: "New Conversation" },
    isPinned: { type: Boolean, default: false },
    systemPrompt: { type: String },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const AiMessageSchema = new Schema<IAiMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "AiConversation", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, required: true },
    aiModel: { type: String },
    attachments: [
      {
        name: { type: String, required: true },
        type: { type: String, required: true },
        url: { type: String },
        mimeType: { type: String },
        size: { type: Number },
        dataUrl: { type: String },
      },
    ],
    sources: [
      {
        title: { type: String },
        url: { type: String },
        snippet: { type: String },
      },
    ],
    status: { type: String, enum: ["sending", "complete", "error"], default: "complete" },
  },
  { timestamps: true }
);

const AiMemorySchema = new Schema<IAiMemory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    key: { type: String, required: true },
    value: { type: String, required: true },
    category: { type: String, default: "preference" },
  },
  { timestamps: true }
);

export const AiConversation =
  mongoose.models.AiConversation || mongoose.model<IAiConversation>("AiConversation", AiConversationSchema);

export const AiMessage =
  mongoose.models.AiMessage || mongoose.model<IAiMessage>("AiMessage", AiMessageSchema);

export const AiMemory =
  mongoose.models.AiMemory || mongoose.model<IAiMemory>("AiMemory", AiMemorySchema);
