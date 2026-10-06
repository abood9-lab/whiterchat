import mongoose, { Schema, type Document } from "mongoose";

export interface IPollOption {
  id: string;
  text: string;
  voterIds: mongoose.Types.ObjectId[];
}

export interface IPoll extends Document {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  question: string;
  options: IPollOption[];
  allowMultiple: boolean;
  allowVoteChange: boolean;
  isClosed: boolean;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PollOptionSchema = new Schema<IPollOption>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    voterIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { _id: false }
);

const PollSchema = new Schema<IPoll>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    question: { type: String, required: true, trim: true },
    options: { type: [PollOptionSchema], required: true },
    allowMultiple: { type: Boolean, default: false },
    allowVoteChange: { type: Boolean, default: true },
    isClosed: { type: Boolean, default: false },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Poll: mongoose.Model<IPoll> = (mongoose.models.Poll as any) ?? mongoose.model<IPoll>("Poll", PollSchema);
