import mongoose, { Schema, type Document } from "mongoose";

export interface IWhiteboard extends Document {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  title: string;
  status: "active" | "archived" | "deleted";
  elements: any[]; // Array of drawing objects (pen paths, shapes, text, images, etc.)
  undoStack: any[]; // History of deleted/previous operations for local/collaborative undo
  redoStack: any[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const WhiteboardSchema = new Schema<IWhiteboard>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "Shared Whiteboard" },
    status: { type: String, enum: ["active", "archived", "deleted"], default: "active" },
    elements: { type: [Schema.Types.Mixed], default: [] } as any,
    undoStack: { type: [Schema.Types.Mixed], default: [] } as any,
    redoStack: { type: [Schema.Types.Mixed], default: [] } as any,
    version: { type: Number, default: 0 },
  },
  { timestamps: true }
);

WhiteboardSchema.index({ conversationId: 1 });

export const Whiteboard: mongoose.Model<IWhiteboard> =
  (mongoose.models.Whiteboard as any) ?? mongoose.model<IWhiteboard>("Whiteboard", WhiteboardSchema);
