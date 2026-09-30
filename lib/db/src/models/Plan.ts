import mongoose, { Schema, type Document } from "mongoose";

export type PlanTier = "free" | "pro" | "vip" | "business";

export interface IPlanFeatures {
  advancedAnalytics: boolean;
  creatorInsights: boolean;
  businessAnalytics: boolean;
  aiAssistantHighQuota: boolean;
  priorityUpload: boolean;
  premiumThemes: boolean;
  teamManagement: boolean;
  businessProfile: boolean;
  businessQuickReplies: boolean;
  exportDataAdvanced: boolean;
  customBadgeDisplay: boolean;
  [key: string]: boolean;
}

export interface IPlanLimits {
  dailyAiGenerations: number;
  maxCarouselMedia: number;
  maxReelSizeMB: number;
  maxSavedCollections: number;
  maxCustomLinks: number;
  maxTeamMembers: number;
  analyticsRetentionDays: number;
  [key: string]: number;
}

export interface IPlanConfig extends Document {
  _id: mongoose.Types.ObjectId;
  planId: PlanTier;
  name: string;
  tagline: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  badgeLabel: string;
  badgeColor: string;
  perks: string[];
  features: IPlanFeatures;
  limits: IPlanLimits;
  isActive: boolean;
  isPopular: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlanConfigSchema = new Schema<IPlanConfig>(
  {
    planId: {
      type: String,
      enum: ["free", "pro", "vip", "business"],
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true },
    tagline: { type: String, default: "" },
    description: { type: String, default: "" },
    priceMonthly: { type: Number, required: true, min: 0 },
    priceYearly: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "JOD" },
    badgeLabel: { type: String, default: "" },
    badgeColor: { type: String, default: "" },
    perks: [{ type: String }],
    features: {
      type: Schema.Types.Mixed,
      default: {},
    },
    limits: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isActive: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const PlanConfig: mongoose.Model<IPlanConfig> =
  (mongoose.models.PlanConfig as any) ??
  mongoose.model<IPlanConfig>("PlanConfig", PlanConfigSchema);
