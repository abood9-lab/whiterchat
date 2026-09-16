import mongoose, { Schema, type Document } from "mongoose";

export interface IOtpVerification extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  code: string;
  type: "register" | "password_reset" | "email_change";
  payload?: {
    username?: string;
    fullName?: string;
    passwordHash?: string;
    newEmail?: string;
  };
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const OtpVerificationSchema = new Schema<IOtpVerification>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    code: { type: String, required: true },
    type: { type: String, required: true, enum: ["register", "password_reset", "email_change"] },
    payload: {
      username: { type: String },
      fullName: { type: String },
      passwordHash: { type: String },
      newEmail: { type: String },
    },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// TTL index to automatically purge expired codes
OtpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpVerification =
  (mongoose.models.OtpVerification as mongoose.Model<IOtpVerification>) ||
  mongoose.model<IOtpVerification>("OtpVerification", OtpVerificationSchema);
