import mongoose, { Schema, type Document } from "mongoose";

export type ProfileEffectCategory = 
  | "minimal"
  | "aurora"
  | "cyber"
  | "cosmic"
  | "holographic"
  | "luxury"
  | "ambient"
  | "gaming"
  | "seasonal"
  | "abstract"
  | "animated"
  | "neon"
  | "special"
  | "dragon"
  | "animal"
  | "mythical"
  | "dark";

export type ProfileEffectRarity = 
  | "common"
  | "rare"
  | "epic"
  | "legendary"
  | "limited";

export interface IProfileEffectColors {
  primary: string;
  secondary?: string;
  accent?: string;
  glow?: string;
  particles?: string;
  overlay?: string;
}

export interface IProfileEffectLayersConfig {
  baseBackground?: boolean;
  ambientGradient?: boolean;
  lightGlow?: boolean;
  particles?: boolean;
  atmosphericMesh?: boolean;
  interactivePointer?: boolean;
  vignetteOverlay?: boolean;
}

export interface IProfileEffect extends Document {
  _id: mongoose.Types.ObjectId;
  effectId: string; // Unique slug e.g. 'emerald-aurora'
  name: string;
  nameAr?: string;
  description: string;
  descriptionAr?: string;
  extendedDescription?: string;
  extendedDescriptionAr?: string;
  tags?: string[];
  category: ProfileEffectCategory;
  rarity: ProfileEffectRarity;
  badge?: string;
  badgeAr?: string;
  colors: IProfileEffectColors;
  animationType: "wave" | "stream" | "pulse" | "drift" | "shimmer" | "orbit" | "scanline" | "static";
  performanceTier: "low" | "medium" | "high";
  isAnimated: boolean;
  isActive: boolean;
  isFeatured: boolean;
  isDefaultUnlocked: boolean;
  displayOrder: number;
  layersConfig?: IProfileEffectLayersConfig;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileEffectSchema = new Schema<IProfileEffect>(
  {
    effectId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String, required: true },
    descriptionAr: { type: String },
    extendedDescription: { type: String },
    extendedDescriptionAr: { type: String },
    tags: [{ type: String, index: true }],
    category: {
      type: String,
      required: true,
      enum: [
        "minimal",
        "aurora",
        "cyber",
        "cosmic",
        "holographic",
        "luxury",
        "ambient",
        "gaming",
        "seasonal",
        "abstract",
        "animated",
        "neon",
        "special",
        "dragon",
        "animal",
        "mythical",
        "dark",
      ],
      default: "ambient",
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
      overlay: { type: String },
    },
    animationType: {
      type: String,
      required: true,
      enum: ["wave", "stream", "pulse", "drift", "shimmer", "orbit", "scanline", "static"],
      default: "wave",
    },
    performanceTier: {
      type: String,
      required: true,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    isAnimated: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false },
    isDefaultUnlocked: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0, index: true },
    layersConfig: {
      baseBackground: { type: Boolean, default: true },
      ambientGradient: { type: Boolean, default: true },
      lightGlow: { type: Boolean, default: true },
      particles: { type: Boolean, default: true },
      atmosphericMesh: { type: Boolean, default: true },
      interactivePointer: { type: Boolean, default: true },
      vignetteOverlay: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

ProfileEffectSchema.index({ category: 1, isActive: 1, displayOrder: 1 });

export const ProfileEffect: mongoose.Model<IProfileEffect> =
  (mongoose.models.ProfileEffect as any) ??
  mongoose.model<IProfileEffect>("ProfileEffect", ProfileEffectSchema);
