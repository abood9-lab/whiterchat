import mongoose, { Schema, type Document } from "mongoose";

export type DecorationCategory = 
  | "classic"
  | "minimal"
  | "neon"
  | "cyber"
  | "luxury"
  | "animated"
  | "seasonal"
  | "gaming"
  | "holographic"
  | "cosmic"
  | "special";

export type DecorationRarity = 
  | "common"
  | "rare"
  | "epic"
  | "legendary"
  | "limited";

export interface IDecorationColors {
  primary: string;
  secondary?: string;
  accent?: string;
  glow?: string;
  particles?: string;
}

export interface IProfileDecoration extends Document {
  _id: mongoose.Types.ObjectId;
  decorationId: string; // Unique slug identifier e.g. 'emerald-energy'
  name: string;
  nameAr?: string;
  description: string;
  descriptionAr?: string;
  category: DecorationCategory;
  rarity: DecorationRarity;
  badge?: string;
  badgeAr?: string;
  colors: IDecorationColors;
  animationType: "spin" | "pulse" | "float" | "shimmer" | "orbit" | "static";
  isAnimated: boolean;
  isActive: boolean;
  isDefaultUnlocked: boolean; // True if available to all users by default
  displayOrder: number;
  layersConfig?: {
    baseRing?: boolean;
    outerShape?: boolean;
    glowBloom?: boolean;
    particles?: boolean;
    animatedAccents?: boolean;
    shadowDepth?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ProfileDecorationSchema = new Schema<IProfileDecoration>(
  {
    decorationId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String, required: true },
    descriptionAr: { type: String },
    category: {
      type: String,
      required: true,
      enum: [
        "classic",
        "minimal",
        "neon",
        "cyber",
        "luxury",
        "animated",
        "seasonal",
        "gaming",
        "holographic",
        "cosmic",
        "special",
      ],
      default: "classic",
    },
    rarity: {
      type: String,
      required: true,
      enum: ["common", "rare", "epic", "legendary", "limited"],
      default: "common",
    },
    badge: { type: String },
    badgeAr: { type: String },
    colors: {
      primary: { type: String, required: true },
      secondary: { type: String },
      accent: { type: String },
      glow: { type: String },
      particles: { type: String },
    },
    animationType: {
      type: String,
      enum: ["spin", "pulse", "float", "shimmer", "orbit", "static"],
      default: "pulse",
    },
    isAnimated: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    isDefaultUnlocked: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    layersConfig: {
      baseRing: { type: Boolean, default: true },
      outerShape: { type: Boolean, default: true },
      glowBloom: { type: Boolean, default: true },
      particles: { type: Boolean, default: true },
      animatedAccents: { type: Boolean, default: true },
      shadowDepth: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

ProfileDecorationSchema.index({ category: 1, displayOrder: 1 });
ProfileDecorationSchema.index({ rarity: 1 });
ProfileDecorationSchema.index({ isActive: 1 });

export const ProfileDecoration: mongoose.Model<IProfileDecoration> =
  (mongoose.models.ProfileDecoration as any) ??
  mongoose.model<IProfileDecoration>("ProfileDecoration", ProfileDecorationSchema);
