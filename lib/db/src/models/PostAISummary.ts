import mongoose, { Schema, type Document } from "mongoose";

export interface IPostAISummary extends Omit<Document, "model"> {
  postId: mongoose.Types.ObjectId;
  contentHash: string;
  language: string;
  summary: string;
  suggestedQuestions: string[];
  model: string;
  createdAt: Date;
  updatedAt: Date;
}

const PostAISummarySchema = new Schema<IPostAISummary>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    contentHash: { type: String, required: true, index: true },
    language: { type: String, default: "auto" },
    summary: { type: String, required: true },
    suggestedQuestions: [{ type: String }],
    model: { type: String, default: "gemini-3.8-flash" },
  },
  { timestamps: true }
);

PostAISummarySchema.index({ postId: 1, contentHash: 1, language: 1 }, { unique: true });

export const PostAISummary = mongoose.models.PostAISummary || mongoose.model<IPostAISummary>("PostAISummary", PostAISummarySchema);
