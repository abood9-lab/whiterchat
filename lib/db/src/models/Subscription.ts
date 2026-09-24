import mongoose, { Schema, type Document } from "mongoose";
import type { PlanTier } from "./Plan.js";

export interface ISubscriptionHistory {
  action: "created" | "upgraded" | "downgraded" | "renewed" | "cancelled" | "expired" | "admin_assigned";
  fromPlan: string;
  toPlan: string;
  date: Date;
  actorAdminId?: mongoose.Types.ObjectId;
  reason?: string;
}

export interface ISubscription extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  planId: PlanTier;
  status: "active" | "cancelled" | "expired" | "past_due";
  billingCycle: "monthly" | "yearly";
  amount: number;
  currency: string;
  paymentMethod: "manual_transfer" | "card" | "admin_grant" | "free_default";
  startedAt: Date;
  expiresAt?: Date;
  cancelledAt?: Date;
  autoRenew: boolean;
  history: ISubscriptionHistory[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planId: {
      type: String,
      enum: ["free", "pro", "vip", "business"],
      required: true,
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "cancelled", "expired", "past_due"],
      default: "active",
      index: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "JOD" },
    paymentMethod: {
      type: String,
      enum: ["manual_transfer", "card", "admin_grant", "free_default"],
      default: "free_default",
    },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    autoRenew: { type: Boolean, default: false },
    history: [
      {
        action: { type: String, required: true },
        fromPlan: { type: String, required: true },
        toPlan: { type: String, required: true },
        date: { type: Date, default: Date.now },
        actorAdminId: { type: Schema.Types.ObjectId, ref: "User" },
        reason: { type: String },
      },
    ],
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ userId: 1, status: 1 });

export const Subscription: mongoose.Model<ISubscription> =
  (mongoose.models.Subscription as any) ??
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
