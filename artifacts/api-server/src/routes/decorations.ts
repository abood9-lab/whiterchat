import { Router, type IRouter } from "express";
import { User, ProfileDecoration, ProfileEffect, type IProfileDecoration } from "@workspace/db";
import { requireAuth, optionalAuth, type AuthRequest } from "../lib/auth";
import { logger } from "../lib/logger";
import { INITIAL_EFFECTS } from "./effects";

const router: IRouter = Router();

// ── DEFAULT CATALOG SEED DATA ───────────────────────────────────────────────
export const INITIAL_DECORATIONS = [
  {
    decorationId: "emerald-energy",
    name: "Emerald Energy",
    nameAr: "الطاقة الزمردية",
    description: "WhiterChat's signature sovereign energy matrix with pulsing neon green conduits and orbital particles.",
    descriptionAr: "مصفوفة الطاقة السيادية المميزة لـ WhiterChat بنبضات الزمرد النيون والجزيئات المدارية.",
    category: "neon",
    rarity: "legendary",
    badge: "Signature",
    badgeAr: "العلامة الفارقة",
    colors: {
      primary: "#10b981",
      secondary: "#059669",
      accent: "#34d399",
      glow: "rgba(52, 211, 153, 0.45)",
      particles: "#6ee7b7",
    },
    animationType: "pulse",
    isAnimated: true,
    isActive: true,
    isDefaultUnlocked: true,
    displayOrder: 1,
  },
  {
    decorationId: "black-chrome",
    name: "Black Chrome",
    nameAr: "الكروم الأسود",
    description: "Heavy obsidian-tinted industrial metal bevels with specular chrome edge reflections.",
    descriptionAr: "حواف معدنية صناعية بلون الأوبسيديان مع انعكاسات كروم دقيقة وفاخرة.",
    category: "cyber",
    rarity: "epic",
    badge: "Industrial",
    badgeAr: "صناعي متقدم",
    colors: {
      primary: "#3f3f46",
      secondary: "#18181b",
      accent: "#71717a",
      glow: "rgba(161, 161, 170, 0.25)",
      particles: "#d4d4d8",
    },
    animationType: "shimmer",
    isAnimated: true,
    isActive: true,
    isDefaultUnlocked: true,
    displayOrder: 2,
  },
  {
    decorationId: "aurora-ring",
    name: "Aurora Borealis",
    nameAr: "شفق الشَّمال",
    description: "Atmospheric celestial plasma wave undulating between electric emerald and deep arctic cyan.",
    descriptionAr: "موجة بلازما قطبية شفقية ساحرة تتماوج بين الزمرد المشع والأزرق السياني العميق.",
    category: "holographic",
    rarity: "rare",
    badge: "Atmospheric",
    badgeAr: "شفق كوني",
    colors: {
      primary: "#06b6d4",
      secondary: "#10b981",
      accent: "#22d3ee",
      glow: "rgba(34, 211, 238, 0.4)",
      particles: "#67e8f9",
    },
    animationType: "float",
    isAnimated: true,
    isActive: true,
    isDefaultUnlocked: true,
    displayOrder: 3,
  },
  {
    decorationId: "cyber-core",
    name: "Cyber Core",
    nameAr: "النواة الرقمية",
    description: "Hexagonal telemetry frame with rotating target calipers and holographic corner brackets.",
    descriptionAr: "إطار سداسي للمعايرة الرقمية مع عيارات استهداف دوارة وأقواس هولوغرافية دقيقة.",
    category: "cyber",
    rarity: "epic",
    badge: "Tactical",
    badgeAr: "تكتيكي سايبر",
    colors: {
      primary: "#0ea5e9",
      secondary: "#0369a1",
      accent: "#38bdf8",
      glow: "rgba(56, 189, 248, 0.45)",
      particles: "#7dd3fc",
    },
    animationType: "spin",
    isAnimated: true,
    isActive: true,
    isDefaultUnlocked: true,
    displayOrder: 4,
  },
  {
    decorationId: "holographic-frame",
    name: "Prism Hologram",
    nameAr: "الإطار الهولوغرافي",
    description: "Prismatic diffraction field creating iridescent rainbow gradients with dynamic light shifting.",
    descriptionAr: "حقل انكسار لوني بلوري ينتج تدرجات قزحية هولوغرافية تتفاعل مع الحركة.",
    category: "holographic",
    rarity: "epic",
    badge: "Iridescent",
    badgeAr: "قزحي مشع",
    colors: {
      primary: "#ec4899",
      secondary: "#8b5cf6",
      accent: "#f472b6",
      glow: "rgba(236, 72, 153, 0.4)",
      particles: "#c084fc",
    },
    animationType: "shimmer",
    isAnimated: true,
    isActive: true,
    isDefaultUnlocked: true,
    displayOrder: 5,
  },
  {
    decorationId: "dark-crystal",
    name: "Dark Crystal",
    nameAr: "البلور الداكن",
    description: "Geometric faceted amethyst shards encased in a deep violet void resonance field.",
    descriptionAr: "شظايا بلورية هندسية من الجمشت البنفسجي محاطة بمجال رنين عميق من الفضاء.",
    category: "luxury",
    rarity: "rare",
    badge: "Crystalline",
    badgeAr: "بلوري نادر",
    colors: {
      primary: "#8b5cf6",
      secondary: "#5b21b6",
      accent: "#a78bfa",
      glow: "rgba(139, 92, 246, 0.4)",
      particles: "#c4b5fd",
    },
    animationType: "pulse",
    isAnimated: true,
    isActive: true,
    isDefaultUnlocked: true,
    displayOrder: 6,
  },
  {
    decorationId: "cosmic-orbit",
    name: "Cosmic Orbit",
    nameAr: "المدار الكوني",
    description: "Deep space dual-ellipse orbital rings with planetary micro-nodes traversing the perimeter.",
    descriptionAr: "حلقات مدارية ثنائية بيضاوية في الفضاء السحيق مع عقد ومسارات كوكبية دائرية.",
    category: "cosmic",
    rarity: "legendary",
    badge: "Celestial",
    badgeAr: "مداري كوني",
    colors: {
      primary: "#6366f1",
      secondary: "#3730a3",
      accent: "#818cf8",
      glow: "rgba(99, 102, 241, 0.45)",
      particles: "#a5b4fc",
    },
    animationType: "orbit",
    isAnimated: true,
    isActive: true,
    isDefaultUnlocked: true,
    displayOrder: 7,
  },
  {
    decorationId: "neon-pulse",
    name: "Neon Pulse",
    nameAr: "النبض النيوني",
    description: "Ultra-vibrant high-voltage cybernetic pulse ring with rhythmic breathing luminescence.",
    descriptionAr: "حلقة نبض سيبرانية عالية التوهج تتنفس بتناغم ضوئي كهربائي ملفت.",
    category: "neon",
    rarity: "common",
    badge: "Vibrant",
    badgeAr: "حيوي نيون",
    colors: {
      primary: "#22c55e",
      secondary: "#15803d",
      accent: "#4ade80",
      glow: "rgba(34, 197, 94, 0.4)",
      particles: "#86efac",
    },
    animationType: "pulse",
    isAnimated: true,
    isActive: true,
    isDefaultUnlocked: true,
    displayOrder: 8,
  },
  {
    decorationId: "glass-halo",
    name: "Frosted Glass Halo",
    nameAr: "الهالة الزجاجية",
    description: "Subtle translucent glassmorphism ring with soft specular rim lighting and refined caustics.",
    descriptionAr: "حلقة زجاجية مثلجة شبه شفافة ذات إضاءة محيطية نقية وتفاصيل لمعان هادئة.",
    category: "minimal",
    rarity: "common",
    badge: "Pristine",
    badgeAr: "زجاجي نقي",
    colors: {
      primary: "#ffffff",
      secondary: "#94a3b8",
      accent: "#f8fafc",
      glow: "rgba(255, 255, 255, 0.25)",
      particles: "#e2e8f0",
    },
    animationType: "static",
    isAnimated: false,
    isActive: true,
    isDefaultUnlocked: true,
    displayOrder: 9,
  },
  {
    decorationId: "royal-metallic",
    name: "Royal Gold Matrix",
    nameAr: "الذهب الملكي",
    description: "Imperial 24k polished gold crown framing with subtle champagne radiance and crest accents.",
    descriptionAr: "إطار تاجي من الذهب المصقول عيار 24 قيراط مع بريق الشمبانيا وتفاصيل ملكية فاخرة.",
    category: "luxury",
    rarity: "legendary",
    badge: "Crown Class",
    badgeAr: "الفئة الملكية",
    colors: {
      primary: "#eab308",
      secondary: "#854d0e",
      accent: "#fde047",
      glow: "rgba(234, 179, 8, 0.45)",
      particles: "#fef08a",
    },
    animationType: "shimmer",
    isAnimated: true,
    isActive: true,
    isDefaultUnlocked: true,
    displayOrder: 10,
  },
  {
    decorationId: "digital-storm",
    name: "Digital Storm",
    nameAr: "العاصفة الرقمية",
    description: "Electric spark arcs and dynamic plasma vortices orbiting the profile boundary.",
    descriptionAr: "شحنات كهربائية وصواعق سيانية رقمية تدور بحيوية حول حدود الصورة الشخصية.",
    category: "animated",
    rarity: "epic",
    badge: "Electrified",
    badgeAr: "صاعق كهربائي",
    colors: {
      primary: "#38bdf8",
      secondary: "#1d4ed8",
      accent: "#60a5fa",
      glow: "rgba(56, 189, 248, 0.5)",
      particles: "#93c5fd",
    },
    animationType: "spin",
    isAnimated: true,
    isActive: true,
    isDefaultUnlocked: true,
    displayOrder: 11,
  },
  {
    decorationId: "minimal-premium",
    name: "Minimal Prestige",
    nameAr: "الأناقة المينيمالية",
    description: "Dual hairline precision titanium rings with a smooth roving gradient apex dot.",
    descriptionAr: "حلقتان من التيتانيوم الدقيق بخط رفيع مزدوج ونقطة ارتكاز ضوئية متدرجة وسلسة.",
    category: "minimal",
    rarity: "common",
    badge: "Subtle",
    badgeAr: "هادئ أنيق",
    colors: {
      primary: "#94a3b8",
      secondary: "#475569",
      accent: "#cbd5e1",
      glow: "rgba(148, 163, 184, 0.3)",
      particles: "#f1f5f9",
    },
    animationType: "float",
    isAnimated: true,
    isActive: true,
    isDefaultUnlocked: true,
    displayOrder: 12,
  },
];

// Helper to seed/synchronize decorations in database
export async function ensureDecorationsSeeded() {
  try {
    for (const item of INITIAL_DECORATIONS) {
      await ProfileDecoration.findOneAndUpdate(
        { decorationId: item.decorationId },
        { $setOnInsert: item },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    logger.warn({ err }, "Could not seed decorations to database (DB might be offline)");
  }
}

// ── GET /api/profile/decorations ─────────────────────────────────────────────
// Returns catalog of active decorations. If DB is unavailable, returns in-memory catalog
router.get("/profile/decorations", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    let decorations: any[] = [];
    try {
      decorations = await ProfileDecoration.find({ isActive: true }).sort({ displayOrder: 1 }).lean();
    } catch {
      // Fallback to in-memory if DB call fails
      decorations = INITIAL_DECORATIONS.filter(d => d.isActive);
    }

    if (!decorations || decorations.length === 0) {
      decorations = INITIAL_DECORATIONS.filter(d => d.isActive);
    }

    // If user is authenticated, determine ownership status
    let userUnlockedIds: string[] = [];
    let userActiveId: string | null = null;

    if (req.userId) {
      try {
        const user = await User.findById(req.userId).select("activeDecorationId unlockedDecorations subscriptionPlan role");
        if (user) {
          userActiveId = user.activeDecorationId || null;
          userUnlockedIds = user.unlockedDecorations || [];
        }
      } catch {
        // Ignore user lookup error
      }
    }

    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    let filtered = decorations;
    if (category && category !== "all") {
      filtered = filtered.filter(d => d.category === category);
    }

    const result = filtered.map(d => {
      const isOwned = d.isDefaultUnlocked || userUnlockedIds.includes(d.decorationId);
      const isSelected = userActiveId === d.decorationId;
      return {
        id: d.decorationId,
        decorationId: d.decorationId,
        name: d.name,
        nameAr: d.nameAr || d.name,
        description: d.description,
        descriptionAr: d.descriptionAr || d.description,
        category: d.category,
        rarity: d.rarity,
        badge: d.badge || null,
        badgeAr: d.badgeAr || null,
        colors: d.colors,
        animationType: d.animationType,
        isAnimated: d.isAnimated,
        isDefaultUnlocked: d.isDefaultUnlocked,
        isOwned,
        isSelected,
        status: isSelected ? "selected" : (isOwned ? "owned" : "locked"),
      };
    });

    res.json({
      decorations: result,
      activeDecorationId: userActiveId,
      total: result.length,
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to get decorations");
    res.status(500).json({ error: "Failed to retrieve profile decorations" });
  }
});

// ── GET /api/profile/decorations/:id ─────────────────────────────────────────
router.get("/profile/decorations/:id", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const { id } = req.params;
  try {
    let decoration = await ProfileDecoration.findOne({ decorationId: id }).lean();
    if (!decoration) {
      decoration = INITIAL_DECORATIONS.find(d => d.decorationId === id) as any;
    }

    if (!decoration || !decoration.isActive) {
      res.status(404).json({ error: "Decoration not found or currently unavailable" });
      return;
    }

    let isOwned = decoration.isDefaultUnlocked;
    let isSelected = false;

    if (req.userId) {
      const user = await User.findById(req.userId).select("activeDecorationId unlockedDecorations");
      if (user) {
        if (user.unlockedDecorations?.includes(decoration.decorationId)) isOwned = true;
        if (user.activeDecorationId === decoration.decorationId) isSelected = true;
      }
    }

    res.json({
      ...decoration,
      id: decoration.decorationId,
      isOwned,
      isSelected,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch decoration details" });
  }
});

// ── GET /api/users/me/appearance ─────────────────────────────────────────────
router.get("/users/me/appearance", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select(
      "username fullName avatarUrl activeDecorationId unlockedDecorations activeProfileEffectId unlockedProfileEffects subscriptionPlan role"
    );
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let activeDecoration = null;
    if (user.activeDecorationId) {
      activeDecoration = await ProfileDecoration.findOne({ decorationId: user.activeDecorationId }).lean();
      if (!activeDecoration) {
        activeDecoration = INITIAL_DECORATIONS.find(d => d.decorationId === user.activeDecorationId) as any;
      }
    }

    let activeProfileEffect = null;
    if (user.activeProfileEffectId) {
      activeProfileEffect = await ProfileEffect.findOne({ effectId: user.activeProfileEffectId }).lean();
      if (!activeProfileEffect) {
        activeProfileEffect = INITIAL_EFFECTS.find(e => e.effectId === user.activeProfileEffectId) as any;
      }
    }

    res.json({
      userId: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl || null,
      activeDecorationId: user.activeDecorationId || null,
      activeDecoration,
      unlockedDecorations: user.unlockedDecorations || [],
      activeProfileEffectId: user.activeProfileEffectId || null,
      activeProfileEffect,
      unlockedProfileEffects: user.unlockedProfileEffects || [],
      subscriptionPlan: user.subscriptionPlan || "free",
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch appearance settings" });
  }
});

// ── PATCH /api/users/me/appearance ───────────────────────────────────────────
router.patch("/users/me/appearance", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { decorationId, profileEffectId } = req.body as {
    decorationId?: string | null;
    profileEffectId?: string | null;
  };

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const isVipOrAdmin =
      user.role === "admin" ||
      user.role === "superadmin" ||
      user.subscriptionPlan === "vip" ||
      user.subscriptionPlan === "business";

    // Handle decoration update if specified
    let updatedDecoration: any = undefined;
    if (decorationId !== undefined) {
      if (decorationId === null || decorationId === "" || decorationId === "none") {
        user.activeDecorationId = null;
      } else {
        let decoration = await ProfileDecoration.findOne({ decorationId, isActive: true });
        if (!decoration) {
          const memoryMatch = INITIAL_DECORATIONS.find(d => d.decorationId === decorationId && d.isActive);
          if (!memoryMatch) {
            res.status(400).json({ error: "Invalid or inactive decoration ID" });
            return;
          }
          decoration = memoryMatch as any;
        }

        const isDefaultUnlocked = decoration.isDefaultUnlocked;
        const isUserOwned = user.unlockedDecorations?.includes(decoration.decorationId);
        if (!isDefaultUnlocked && !isUserOwned && !isVipOrAdmin) {
          res.status(403).json({
            error: "You do not own this decoration. Unlock it to apply to your profile.",
            requiredRarity: decoration.rarity,
          });
          return;
        }

        user.activeDecorationId = decoration.decorationId;
        updatedDecoration = decoration;
      }
    }

    // Handle profile effect update if specified
    let updatedEffect: any = undefined;
    if (profileEffectId !== undefined) {
      if (profileEffectId === null || profileEffectId === "" || profileEffectId === "none") {
        user.activeProfileEffectId = null;
      } else {
        let effect = await ProfileEffect.findOne({ effectId: profileEffectId, isActive: true });
        if (!effect) {
          const memoryMatch = INITIAL_EFFECTS.find(e => e.effectId === profileEffectId && e.isActive);
          if (!memoryMatch) {
            res.status(400).json({ error: "Invalid or inactive profile effect ID" });
            return;
          }
          effect = memoryMatch as any;
        }

        const isDefaultUnlocked = effect.isDefaultUnlocked;
        const isUserOwned = user.unlockedProfileEffects?.includes(effect.effectId);
        if (!isDefaultUnlocked && !isUserOwned && !isVipOrAdmin) {
          res.status(403).json({
            error: "You do not own this profile effect. Unlock it to apply to your profile.",
            requiredRarity: effect.rarity,
          });
          return;
        }

        user.activeProfileEffectId = effect.effectId;
        updatedEffect = effect;
      }
    }

    await user.save();

    res.json({
      message: "Profile appearance updated successfully",
      activeDecorationId: user.activeDecorationId,
      activeProfileEffectId: user.activeProfileEffectId,
      decoration: updatedDecoration,
      effect: updatedEffect,
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to update appearance");
    res.status(500).json({ error: "Failed to update profile appearance" });
  }
});

// ── POST /api/profile/decorations/:id/apply ──────────────────────────────────
router.post("/profile/decorations/:id/apply", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { id } = req.params;

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let decoration = await ProfileDecoration.findOne({ decorationId: id, isActive: true });
    if (!decoration) {
      const memoryMatch = INITIAL_DECORATIONS.find(d => d.decorationId === id && d.isActive);
      if (!memoryMatch) {
        res.status(404).json({ error: "Decoration not found or unavailable" });
        return;
      }
      decoration = memoryMatch as any;
    }

    const isDefaultUnlocked = decoration.isDefaultUnlocked;
    const isUserOwned = user.unlockedDecorations?.includes(decoration.decorationId);
    const isVipOrAdmin = user.role === "admin" || user.role === "superadmin" || user.subscriptionPlan === "vip" || user.subscriptionPlan === "business";

    if (!isDefaultUnlocked && !isUserOwned && !isVipOrAdmin) {
      res.status(403).json({
        error: "This decoration is locked. Upgrade your tier or acquire it to apply.",
      });
      return;
    }

    user.activeDecorationId = decoration.decorationId;
    await user.save();

    res.json({
      message: `Applied ${decoration.name} to your profile!`,
      activeDecorationId: user.activeDecorationId,
      decoration,
    });
  } catch (err: any) {
    logger.error({ err }, "Apply decoration error");
    res.status(500).json({ error: "Failed to apply decoration" });
  }
});

// ── DELETE /api/profile/decorations/active ───────────────────────────────────
router.delete("/profile/decorations/active", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { activeDecorationId: null },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      message: "Active decoration removed successfully",
      activeDecorationId: null,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to remove active decoration" });
  }
});

export default router;
