import mongoose, { Schema, type Document } from "mongoose";

export interface IFeedbackReply {
  adminId: mongoose.Types.ObjectId;
  adminUsername: string;
  text: string;
  isInternal: boolean;
  createdAt: Date;
}

export interface IFeedback extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: "bug" | "feature" | "ui" | "performance" | "other";
  title: string;
  description: string;
  bugDetails?: {
    whatHappened?: string;
    whatExpected?: string;
    stepsToReproduce?: string;
    pageContext?: string;
    browserInfo?: string;
  };
  pageContext?: string;
  attachments: string[];
  status: "submitted" | "under_review" | "in_progress" | "resolved" | "closed";
  rating?: number;
  adminReplies: IFeedbackReply[];
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["bug", "feature", "ui", "performance", "other"],
      default: "other",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    bugDetails: {
      whatHappened: { type: String, default: null },
      whatExpected: { type: String, default: null },
      stepsToReproduce: { type: String, default: null },
      pageContext: { type: String, default: null },
      browserInfo: { type: String, default: null },
    },
    pageContext: { type: String, default: null },
    attachments: [{ type: String }],
    status: {
      type: String,
      enum: ["submitted", "under_review", "in_progress", "resolved", "closed"],
      default: "submitted",
      index: true,
    },
    rating: { type: Number, min: 1, max: 5, default: null },
    adminReplies: [
      {
        adminId: { type: Schema.Types.ObjectId, ref: "User" },
        adminUsername: { type: String },
        text: { type: String, required: true },
        isInternal: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

FeedbackSchema.index({ userId: 1, createdAt: -1 });

export const Feedback: mongoose.Model<IFeedback> =
  (mongoose.models.Feedback as any) ?? mongoose.model<IFeedback>("Feedback", FeedbackSchema);
