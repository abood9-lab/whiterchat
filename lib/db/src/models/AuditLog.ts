import mongoose, { Schema, type Document } from "mongoose";

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  adminUsername: string;
  adminRole: string;
  action: string;
  targetType: "user" | "post" | "reel" | "story" | "comment" | "report" | "feedback" | "security" | "settings" | "system" | "verification" | "group" | "plan";
  targetId?: string;
  targetSummary?: string;
  reason?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    adminUsername: { type: String, required: true },
    adminRole: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    targetType: {
      type: String,
      enum: ["user", "post", "reel", "story", "comment", "report", "feedback", "security", "settings", "system", "verification", "group", "plan"],
      required: true,
      index: true,
    },
    targetId: { type: String, default: null, index: true },
    targetSummary: { type: String, default: null },
    reason: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1 });

export const AuditLog: mongoose.Model<IAuditLog> =
  (mongoose.models.AuditLog as any) ?? mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
