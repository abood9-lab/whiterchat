import mongoose, { Schema, type Document } from "mongoose";

export interface IVerificationPlan extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  perks: string[];
  badgeType: string;
  isActive: boolean;
  isPopular: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVerificationPaymentConfig extends Document {
  _id: mongoose.Types.ObjectId;
  paymentMethodName: string;
  walletName: string;
  walletAddress: string;
  currency: string;
  instructions: string;
  additionalNotes?: string;
  isDefault: boolean;
  isActive: boolean;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVerificationRequest extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  planSnapshot: {
    name: string;
    description?: string;
    price: number;
    currency: string;
    durationDays: number;
    perks: string[];
    badgeType?: string;
  };
  status: "pending" | "awaiting_payment" | "payment_submitted" | "approved" | "rejected" | "expired" | "cancelled";
  paymentInstructions?: {
    methodName: string;
    walletName: string;
    walletAddress: string;
    currency: string;
    instructions: string;
    additionalNotes?: string;
    sentAt: Date;
    sentBy?: mongoose.Types.ObjectId;
  };
  paymentProof?: {
    submittedAt: Date;
    transactionId?: string;
    proofImageUrl?: string;
    userNote?: string;
  };
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  adminNotes?: string;
  approvedAt?: Date;
  expiresAt?: Date;
  renewalOfRequestId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationPlanSchema = new Schema<IVerificationPlan>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "JOD", uppercase: true, trim: true },
    durationDays: { type: Number, default: 30 },
    perks: [{ type: String }],
    badgeType: {
      type: String,
      enum: ["blue_check", "gold_badge", "creator_pro", "enterprise"],
      default: "blue_check",
    },
    isActive: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const VerificationPaymentConfigSchema = new Schema<IVerificationPaymentConfig>(
  {
    paymentMethodName: { type: String, required: true, trim: true },
    walletName: { type: String, required: true, trim: true },
    walletAddress: { type: String, required: true, trim: true },
    currency: { type: String, default: "JOD", uppercase: true },
    instructions: { type: String, required: true },
    additionalNotes: { type: String, default: "" },
    isDefault: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

const VerificationRequestSchema = new Schema<IVerificationRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: "VerificationPlan", required: true },
    planSnapshot: {
      name: { type: String, required: true },
      description: { type: String },
      price: { type: Number, required: true },
      currency: { type: String, required: true },
      durationDays: { type: Number, default: 30 },
      perks: [{ type: String }],
      badgeType: { type: String, default: "blue_check" },
    },
    status: {
      type: String,
      enum: ["pending", "awaiting_payment", "payment_submitted", "approved", "rejected", "expired", "cancelled"],
      default: "pending",
      index: true,
    },
    paymentInstructions: {
      methodName: { type: String },
      walletName: { type: String },
      walletAddress: { type: String },
      currency: { type: String },
      instructions: { type: String },
      additionalNotes: { type: String },
      sentAt: { type: Date },
      sentBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    paymentProof: {
      submittedAt: { type: Date },
      transactionId: { type: String },
      proofImageUrl: { type: String },
      userNote: { type: String },
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
    approvedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: true },
    renewalOfRequestId: { type: Schema.Types.ObjectId, ref: "VerificationRequest", default: null },
  },
  { timestamps: true }
);

VerificationPlanSchema.index({ isActive: 1, order: 1 });
VerificationRequestSchema.index({ userId: 1, status: 1 });
VerificationRequestSchema.index({ createdAt: -1 });

export const VerificationPlan: mongoose.Model<IVerificationPlan> =
  (mongoose.models.VerificationPlan as any) ??
  mongoose.model<IVerificationPlan>("VerificationPlan", VerificationPlanSchema);

export const VerificationPaymentConfig: mongoose.Model<IVerificationPaymentConfig> =
  (mongoose.models.VerificationPaymentConfig as any) ??
  mongoose.model<IVerificationPaymentConfig>("VerificationPaymentConfig", VerificationPaymentConfigSchema);

export const VerificationRequest: mongoose.Model<IVerificationRequest> =
  (mongoose.models.VerificationRequest as any) ??
  mongoose.model<IVerificationRequest>("VerificationRequest", VerificationRequestSchema);
