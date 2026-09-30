import React from "react";

export interface DecorationMetadata {
  id: string;
  name: string;
  nameAr: string;
  category: "classic" | "minimal" | "neon" | "cyber" | "luxury" | "animated" | "seasonal" | "gaming" | "holographic" | "cosmic" | "special";
  rarity: "common" | "rare" | "epic" | "legendary" | "limited";
  badge?: string;
  badgeAr?: string;
  description: string;
  descriptionAr: string;
  colors: {
    primary: string;
    secondary?: string;
    accent?: string;
    glow?: string;
    particles?: string;
  };
  animationType: "spin" | "pulse" | "float" | "shimmer" | "orbit" | "static";
}

// ── 12 ORIGINAL HIGH-END WHITERCHAT DECORATIONS ─────────────────────────────
export const DECORATIONS_CATALOG: DecorationMetadata[] = [
  {
    id: "emerald-energy",
    name: "Emerald Energy",
    nameAr: "الطاقة الزمردية",
    category: "neon",
    rarity: "legendary",
    badge: "Signature",
    badgeAr: "العلامة الفارقة",
    description: "WhiterChat's signature sovereign energy matrix with pulsing neon green conduits and orbital particles.",
    descriptionAr: "مصفوفة الطاقة السيادية المميزة لـ WhiterChat بنبضات الزمرد النيون والجزيئات المدارية.",
    colors: {
      primary: "#10b981",
      secondary: "#059669",
      accent: "#34d399",
      glow: "rgba(52, 211, 153, 0.45)",
      particles: "#6ee7b7",
    },
    animationType: "pulse",
  },
  {
    id: "black-chrome",
    name: "Black Chrome",
    nameAr: "الكروم الأسود",
    category: "cyber",
    rarity: "epic",
    badge: "Industrial",
    badgeAr: "صناعي متقدم",
    description: "Heavy obsidian-tinted industrial metal bevels with specular chrome edge reflections.",
    descriptionAr: "حواف معدنية صناعية بلون الأوبسيديان مع انعكاسات كروم دقيقة وفاخرة.",
    colors: {
      primary: "#3f3f46",
      secondary: "#18181b",
      accent: "#71717a",
      glow: "rgba(161, 161, 170, 0.25)",
      particles: "#d4d4d8",
    },
    animationType: "shimmer",
  },
  {
    id: "aurora-ring",
    name: "Aurora Borealis",
    nameAr: "شفق الشَّمال",
    category: "holographic",
    rarity: "rare",
    badge: "Atmospheric",
    badgeAr: "شفق كوني",
    description: "Atmospheric celestial plasma wave undulating between electric emerald and deep arctic cyan.",
    descriptionAr: "موجة بلازما قطبية شفقية ساحرة تتماوج بين الزمرد المشع والأزرق السياني العميق.",
    colors: {
      primary: "#06b6d4",
      secondary: "#10b981",
      accent: "#22d3ee",
      glow: "rgba(34, 211, 238, 0.4)",
      particles: "#67e8f9",
    },
    animationType: "float",
  },
  {
    id: "cyber-core",
    name: "Cyber Core",
    nameAr: "النواة الرقمية",
    category: "cyber",
    rarity: "epic",
    badge: "Tactical",
    badgeAr: "تكتيكي سايبر",
    description: "Hexagonal telemetry frame with rotating target calipers and holographic corner brackets.",
    descriptionAr: "إطار سداسي للمعايرة الرقمية مع عيارات استهداف دوارة وأقواس هولوغرافية دقيقة.",
    colors: {
      primary: "#0ea5e9",
      secondary: "#0369a1",
      accent: "#38bdf8",
      glow: "rgba(56, 189, 248, 0.45)",
      particles: "#7dd3fc",
    },
    animationType: "spin",
  },
  {
    id: "holographic-frame",
    name: "Prism Hologram",
    nameAr: "الإطار الهولوغرافي",
    category: "holographic",
    rarity: "epic",
    badge: "Iridescent",
    badgeAr: "قزحي مشع",
    description: "Prismatic diffraction field creating iridescent rainbow gradients with dynamic light shifting.",
    descriptionAr: "حقل انكسار لوني بلوري ينتج تدرجات قزحية هولوغرافية تتفاعل مع الحركة.",
    colors: {
      primary: "#ec4899",
      secondary: "#8b5cf6",
      accent: "#f472b6",
      glow: "rgba(236, 72, 153, 0.4)",
      particles: "#c084fc",
    },
    animationType: "shimmer",
  },
  {
    id: "dark-crystal",
    name: "Dark Crystal",
    nameAr: "البلور الداكن",
    category: "luxury",
    rarity: "rare",
    badge: "Crystalline",
    badgeAr: "بلوري نادر",
    description: "Geometric faceted amethyst shards encased in a deep violet void resonance field.",
    descriptionAr: "شظايا بلورية هندسية من الجمشت البنفسجي محاطة بمجال رنين عميق من الفضاء.",
    colors: {
      primary: "#8b5cf6",
      secondary: "#5b21b6",
      accent: "#a78bfa",
      glow: "rgba(139, 92, 246, 0.4)",
      particles: "#c4b5fd",
    },
    animationType: "pulse",
  },
  {
    id: "cosmic-orbit",
    name: "Cosmic Orbit",
    nameAr: "المدار الكوني",
    category: "cosmic",
    rarity: "legendary",
    badge: "Celestial",
    badgeAr: "مداري كوني",
    description: "Deep space dual-ellipse orbital rings with planetary micro-nodes traversing the perimeter.",
    descriptionAr: "حلقات مدارية ثنائية بيضاوية في الفضاء السحيق مع عقد ومسارات كوكبية دائرية.",
    colors: {
      primary: "#6366f1",
      secondary: "#3730a3",
      accent: "#818cf8",
      glow: "rgba(99, 102, 241, 0.45)",
      particles: "#a5b4fc",
    },
    animationType: "orbit",
  },
  {
    id: "neon-pulse",
    name: "Neon Pulse",
    nameAr: "النبض النيوني",
    category: "neon",
    rarity: "common",
    badge: "Vibrant",
    badgeAr: "حيوي نيون",
    description: "Ultra-vibrant high-voltage cybernetic pulse ring with rhythmic breathing luminescence.",
    descriptionAr: "حلقة نبض سيبرانية عالية التوهج تتنفس بتناغم ضوئي كهربائي ملفت.",
    colors: {
      primary: "#22c55e",
      secondary: "#15803d",
      accent: "#4ade80",
      glow: "rgba(34, 197, 94, 0.4)",
      particles: "#86efac",
    },
    animationType: "pulse",
  },
  {
    id: "glass-halo",
    name: "Frosted Glass Halo",
    nameAr: "الهالة الزجاجية",
    category: "minimal",
    rarity: "common",
    badge: "Pristine",
    badgeAr: "زجاجي نقي",
    description: "Subtle translucent glassmorphism ring with soft specular rim lighting and refined caustics.",
    descriptionAr: "حلقة زجاجية مثلجة شبه شفافة ذات إضاءة محيطية نقية وتفاصيل لمعان هادئة.",
    colors: {
      primary: "#ffffff",
      secondary: "#94a3b8",
      accent: "#f8fafc",
      glow: "rgba(255, 255, 255, 0.25)",
      particles: "#e2e8f0",
    },
    animationType: "static",
  },
  {
    id: "royal-metallic",
    name: "Royal Gold Matrix",
    nameAr: "الذهب الملكي",
    category: "luxury",
    rarity: "legendary",
    badge: "Crown Class",
    badgeAr: "الفئة الملكية",
    description: "Imperial 24k polished gold crown framing with subtle champagne radiance and crest accents.",
    descriptionAr: "إطار تاجي من الذهب المصقول عيار 24 قيراط مع بريق الشمبانيا وتفاصيل ملكية فاخرة.",
    colors: {
      primary: "#eab308",
      secondary: "#854d0e",
      accent: "#fde047",
      glow: "rgba(234, 179, 8, 0.45)",
      particles: "#fef08a",
    },
    animationType: "shimmer",
  },
  {
    id: "digital-storm",
    name: "Digital Storm",
    nameAr: "العاصفة الرقمية",
    category: "animated",
    rarity: "epic",
    badge: "Electrified",
    badgeAr: "صاعق كهربائي",
    description: "Electric spark arcs and dynamic plasma vortices orbiting the profile boundary.",
    descriptionAr: "شحنات كهربائية وصواعق سيانية رقمية تدور بحيوية حول حدود الصورة الشخصية.",
    colors: {
      primary: "#38bdf8",
      secondary: "#1d4ed8",
      accent: "#60a5fa",
      glow: "rgba(56, 189, 248, 0.5)",
      particles: "#93c5fd",
    },
    animationType: "spin",
  },
  {
    id: "minimal-premium",
    name: "Minimal Prestige",
    nameAr: "الأناقة المينيمالية",
    category: "minimal",
    rarity: "common",
    badge: "Subtle",
    badgeAr: "هادئ أنيق",
    description: "Dual hairline precision titanium rings with a smooth roving gradient apex dot.",
    descriptionAr: "حلقتان من التيتانيوم الدقيق بخط رفيع مزدوج ونقطة ارتكاز ضوئية متدرجة وسلسة.",
    colors: {
      primary: "#94a3b8",
      secondary: "#475569",
      accent: "#cbd5e1",
      glow: "rgba(148, 163, 184, 0.3)",
      particles: "#f1f5f9",
    },
    animationType: "float",
  },
];

export function getDecorationById(id?: string | null): DecorationMetadata | undefined {
  if (!id) return undefined;
  return DECORATIONS_CATALOG.find((d) => d.id === id);
}

// ── SVG MULTI-LAYER DECORATION COMPONENT ────────────────────────────────────
interface ProfileDecorationRendererProps {
  decorationId: string;
  className?: string;
  size?: number | string;
  animated?: boolean;
}

export function ProfileDecorationRenderer({
  decorationId,
  className = "",
  size = "100%",
  animated = true,
}: ProfileDecorationRendererProps) {
  const dec = getDecorationById(decorationId);
  if (!dec) return null;

  const animClass = animated ? "" : "motion-reduce-all";

  // Individual Distinct Renderers
  switch (decorationId) {
    case "emerald-energy":
      return (
        <svg
          viewBox="0 0 120 120"
          className={`w-full h-full overflow-visible pointer-events-none ${animClass} ${className}`}
          style={{ width: size, height: size }}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="em-glow" cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="#10b981" stopOpacity="0" />
              <stop offset="90%" stopColor="#34d399" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="em-ring" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <filter id="em-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Layer 3: Ambient Glow Bloom */}
          <circle cx="60" cy="60" r="54" fill="url(#em-glow)" className={animated ? "animate-pulse" : ""} />

          {/* Layer 1: Base Anchor Ring */}
          <circle cx="60" cy="60" r="48.5" fill="none" stroke="rgba(16, 185, 129, 0.25)" strokeWidth="1.5" />

          {/* Layer 2: Main Energy Conduit */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="url(#em-ring)"
            strokeWidth="2.8"
            strokeDasharray="22 10 35 14"
            filter="url(#em-blur)"
            className={animated ? "origin-center animate-[spin_12s_linear_infinite]" : ""}
          />

          {/* Layer 4: Segmented Calipers */}
          <g className={animated ? "origin-center animate-[spin_18s_linear_infinite_reverse]" : ""}>
            <circle cx="60" cy="60" r="53" fill="none" stroke="#6ee7b7" strokeWidth="1.5" strokeDasharray="4 40" strokeLinecap="round" />
            <circle cx="60" cy="7" r="2.2" fill="#34d399" filter="url(#em-blur)" />
            <circle cx="60" cy="113" r="2.2" fill="#34d399" filter="url(#em-blur)" />
            <circle cx="7" cy="60" r="2.2" fill="#10b981" filter="url(#em-blur)" />
            <circle cx="113" cy="60" r="2.2" fill="#10b981" filter="url(#em-blur)" />
          </g>

          {/* Layer 5: Corner Orbit Sparks */}
          <g className={animated ? "origin-center animate-[pulse_3s_ease-in-out_infinite]" : ""}>
            <polygon points="60,2 62,6 58,6" fill="#34d399" />
            <polygon points="60,118 62,114 58,114" fill="#34d399" />
            <polygon points="2,60 6,62 6,58" fill="#10b981" />
            <polygon points="118,60 114,62 114,58" fill="#10b981" />
          </g>
        </svg>
      );

    case "black-chrome":
      return (
        <svg
          viewBox="0 0 120 120"
          className={`w-full h-full overflow-visible pointer-events-none ${animClass} ${className}`}
          style={{ width: size, height: size }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="bc-metal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#71717a" />
              <stop offset="35%" stopColor="#18181b" />
              <stop offset="65%" stopColor="#a1a1aa" />
              <stop offset="100%" stopColor="#27272a" />
            </linearGradient>
            <filter id="bc-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000000" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Layer 6: Deep Contrast Shadow */}
          <circle cx="60" cy="60" r="51" fill="none" stroke="#09090b" strokeWidth="4" />

          {/* Layer 1 & 2: Heavy Beveled Rim */}
          <circle
            cx="60"
            cy="60"
            r="49"
            fill="none"
            stroke="url(#bc-metal)"
            strokeWidth="3.2"
            filter="url(#bc-shadow)"
          />

          {/* Layer 4: Precision Machined Notches */}
          <g className={animated ? "origin-center animate-[spin_30s_linear_infinite]" : ""}>
            <circle
              cx="60"
              cy="60"
              r="53"
              fill="none"
              stroke="#a1a1aa"
              strokeWidth="1.2"
              strokeDasharray="2 12"
              strokeLinecap="square"
            />
            {/* Studs */}
            <circle cx="60" cy="6" r="1.8" fill="#e4e4e7" />
            <circle cx="60" cy="114" r="1.8" fill="#e4e4e7" />
            <circle cx="6" cy="60" r="1.8" fill="#71717a" />
            <circle cx="114" cy="60" r="1.8" fill="#71717a" />
          </g>

          {/* Specular Edge Highlights */}
          <path
            d="M 35 15 A 49 49 0 0 1 85 15"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.75"
          />
        </svg>
      );

    case "aurora-ring":
      return (
        <svg
          viewBox="0 0 120 120"
          className={`w-full h-full overflow-visible pointer-events-none ${animClass} ${className}`}
          style={{ width: size, height: size }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="aur-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="35%" stopColor="#10b981" />
              <stop offset="70%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
            <filter id="aur-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {/* Layer 3: Soft Undulating Glow */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="url(#aur-grad)"
            strokeWidth="6"
            opacity="0.4"
            filter="url(#aur-glow)"
            className={animated ? "animate-pulse" : ""}
          />

          {/* Layer 2: Main Floating Aurora Wave */}
          <circle
            cx="60"
            cy="60"
            r="49"
            fill="none"
            stroke="url(#aur-grad)"
            strokeWidth="2.5"
            strokeDasharray="60 15 40 20"
            strokeLinecap="round"
            className={animated ? "origin-center animate-[spin_8s_ease-in-out_infinite_alternate]" : ""}
          />

          {/* Layer 4: Plasma Dust Nodes */}
          <g className={animated ? "origin-center animate-[spin_24s_linear_infinite]" : ""}>
            <circle cx="60" cy="8" r="1.5" fill="#67e8f9" filter="url(#aur-glow)" />
            <circle cx="98" cy="22" r="1.8" fill="#34d399" filter="url(#aur-glow)" />
            <circle cx="112" cy="60" r="1.5" fill="#22d3ee" filter="url(#aur-glow)" />
            <circle cx="22" cy="98" r="2" fill="#60a5fa" filter="url(#aur-glow)" />
          </g>
        </svg>
      );

    case "cyber-core":
      return (
        <svg
          viewBox="0 0 120 120"
          className={`w-full h-full overflow-visible pointer-events-none ${animClass} ${className}`}
          style={{ width: size, height: size }}
          aria-hidden="true"
        >
          <defs>
            <filter id="cy-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Layer 2: Hexagonal Outer Brackets */}
          <g className={animated ? "origin-center animate-[spin_20s_linear_infinite]" : ""}>
            <polygon
              points="60,6 106,33 106,87 60,114 14,87 14,33"
              fill="none"
              stroke="#0284c7"
              strokeWidth="1.2"
              strokeDasharray="16 28"
            />
            {/* Hex Points */}
            <circle cx="60" cy="6" r="2" fill="#38bdf8" filter="url(#cy-glow)" />
            <circle cx="106" cy="33" r="2" fill="#38bdf8" />
            <circle cx="106" cy="87" r="2" fill="#38bdf8" />
            <circle cx="60" cy="114" r="2" fill="#38bdf8" filter="url(#cy-glow)" />
            <circle cx="14" cy="87" r="2" fill="#38bdf8" />
            <circle cx="14" cy="33" r="2" fill="#38bdf8" />
          </g>

          {/* Layer 1: Core Precision Ring */}
          <circle cx="60" cy="60" r="48.5" fill="none" stroke="#0369a1" strokeWidth="2" />

          {/* Layer 4: Telemetry Crosshair Calipers */}
          <g className={animated ? "origin-center animate-[spin_10s_linear_infinite_reverse]" : ""}>
            <path
              d="M 60 7 L 60 14 M 60 106 L 60 113 M 7 60 L 14 60 M 106 60 L 113 60"
              stroke="#38bdf8"
              strokeWidth="2.2"
              strokeLinecap="round"
              filter="url(#cy-glow)"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="4 60"
            />
          </g>
        </svg>
      );

    case "holographic-frame":
      return (
        <svg
          viewBox="0 0 120 120"
          className={`w-full h-full overflow-visible pointer-events-none ${animClass} ${className}`}
          style={{ width: size, height: size }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="holo-prism" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="25%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="75%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <filter id="holo-bloom">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Layer 3: Iridescent Bloom */}
          <circle
            cx="60"
            cy="60"
            r="49"
            fill="none"
            stroke="url(#holo-prism)"
            strokeWidth="5"
            opacity="0.35"
            filter="url(#holo-bloom)"
          />

          {/* Layer 2: Main Holographic Prismatic Ring */}
          <circle
            cx="60"
            cy="60"
            r="49"
            fill="none"
            stroke="url(#holo-prism)"
            strokeWidth="2.8"
            className={animated ? "origin-center animate-[spin_6s_linear_infinite]" : ""}
          />

          {/* Layer 4: Edge Prisms */}
          <g className={animated ? "origin-center animate-[spin_14s_linear_infinite_reverse]" : ""}>
            <polygon points="60,7 63,11 57,11" fill="#f472b6" />
            <polygon points="113,60 109,63 109,57" fill="#c084fc" />
            <polygon points="60,113 57,109 63,109" fill="#38bdf8" />
            <polygon points="7,60 11,57 11,63" fill="#fbbf24" />
          </g>
        </svg>
      );

    case "dark-crystal":
      return (
        <svg
          viewBox="0 0 120 120"
          className={`w-full h-full overflow-visible pointer-events-none ${animClass} ${className}`}
          style={{ width: size, height: size }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="crys-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#3b0764" />
            </linearGradient>
            <filter id="crys-glow">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#a855f7" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Base Inner Ring */}
          <circle cx="60" cy="60" r="48" fill="none" stroke="#581c87" strokeWidth="2" />

          {/* Faceted Crystal Shards Layer */}
          <g filter="url(#crys-glow)" className={animated ? "origin-center animate-[pulse_4s_ease-in-out_infinite]" : ""}>
            {/* Shard 1 (Top) */}
            <polygon points="60,4 66,13 60,11 54,13" fill="url(#crys-grad)" />
            {/* Shard 2 (Top Right) */}
            <polygon points="98,22 101,31 95,28 92,23" fill="url(#crys-grad)" />
            {/* Shard 3 (Right) */}
            <polygon points="116,60 107,66 109,60 107,54" fill="url(#crys-grad)" />
            {/* Shard 4 (Bottom Right) */}
            <polygon points="98,98 92,97 95,92 101,89" fill="url(#crys-grad)" />
            {/* Shard 5 (Bottom) */}
            <polygon points="60,116 54,107 60,109 66,107" fill="url(#crys-grad)" />
            {/* Shard 6 (Bottom Left) */}
            <polygon points="22,98 19,89 25,92 28,97" fill="url(#crys-grad)" />
            {/* Shard 7 (Left) */}
            <polygon points="4,60 13,54 11,60 13,66" fill="url(#crys-grad)" />
            {/* Shard 8 (Top Left) */}
            <polygon points="22,22 28,23 25,28 19,31" fill="url(#crys-grad)" />
          </g>

          {/* Inner Shimmer Ring */}
          <circle
            cx="60"
            cy="60"
            r="49.5"
            fill="none"
            stroke="#a855f7"
            strokeWidth="1.4"
            strokeDasharray="18 12"
            className={animated ? "origin-center animate-[spin_25s_linear_infinite]" : ""}
          />
        </svg>
      );

    case "cosmic-orbit":
      return (
        <svg
          viewBox="0 0 120 120"
          className={`w-full h-full overflow-visible pointer-events-none ${animClass} ${className}`}
          style={{ width: size, height: size }}
          aria-hidden="true"
        >
          <defs>
            <filter id="cos-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Base Anchor Ring */}
          <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="1.5" />

          {/* Primary Orbit Ellipse */}
          <g className={animated ? "origin-center animate-[spin_12s_linear_infinite]" : ""}>
            <ellipse
              cx="60"
              cy="60"
              rx="54"
              ry="45"
              fill="none"
              stroke="#6366f1"
              strokeWidth="1.8"
              strokeDasharray="40 10 20 10"
              filter="url(#cos-glow)"
            />
            {/* Satellite 1 */}
            <circle cx="114" cy="60" r="3.2" fill="#818cf8" filter="url(#cos-glow)" />
            <circle cx="6" cy="60" r="2" fill="#a5b4fc" />
          </g>

          {/* Secondary Crossed Orbit Ellipse */}
          <g className={animated ? "origin-center animate-[spin_18s_linear_infinite_reverse]" : ""}>
            <ellipse
              cx="60"
              cy="60"
              rx="46"
              ry="54"
              fill="none"
              stroke="#a855f7"
              strokeWidth="1.4"
              strokeDasharray="30 15"
            />
            {/* Satellite 2 */}
            <circle cx="60" cy="6" r="2.8" fill="#c084fc" filter="url(#cos-glow)" />
          </g>
        </svg>
      );

    case "neon-pulse":
      return (
        <svg
          viewBox="0 0 120 120"
          className={`w-full h-full overflow-visible pointer-events-none ${animClass} ${className}`}
          style={{ width: size, height: size }}
          aria-hidden="true"
        >
          <defs>
            <filter id="np-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Glowing Aura Ring */}
          <circle
            cx="60"
            cy="60"
            r="49"
            fill="none"
            stroke="#22c55e"
            strokeWidth="3.2"
            filter="url(#np-glow)"
            className={animated ? "origin-center animate-[pulse_2s_ease-in-out_infinite]" : ""}
          />

          {/* Inner Sharp Neon Stroke */}
          <circle
            cx="60"
            cy="60"
            r="48.5"
            fill="none"
            stroke="#4ade80"
            strokeWidth="1.8"
          />

          {/* Pulse Beacons */}
          <g className={animated ? "origin-center animate-[spin_14s_linear_infinite]" : ""}>
            <circle cx="60" cy="11" r="2.5" fill="#86efac" filter="url(#np-glow)" />
            <circle cx="60" cy="109" r="2.5" fill="#86efac" filter="url(#np-glow)" />
          </g>
        </svg>
      );

    case "glass-halo":
      return (
        <svg
          viewBox="0 0 120 120"
          className={`w-full h-full overflow-visible pointer-events-none ${animClass} ${className}`}
          style={{ width: size, height: size }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="gh-specular" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#94a3b8" stopOpacity="0.2" />
              <stop offset="80%" stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0.1" />
            </linearGradient>
            <filter id="gh-blur">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#ffffff" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Outer Translucent Glass Toroid */}
          <circle
            cx="60"
            cy="60"
            r="50.5"
            fill="none"
            stroke="url(#gh-specular)"
            strokeWidth="4"
            filter="url(#gh-blur)"
          />

          {/* Inner Frosted Rim */}
          <circle
            cx="60"
            cy="60"
            r="48"
            fill="none"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="1"
          />

          {/* Specular Crest Flare */}
          <path
            d="M 40 12 A 49 49 0 0 1 80 12"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case "royal-metallic":
      return (
        <svg
          viewBox="0 0 120 120"
          className={`w-full h-full overflow-visible pointer-events-none ${animClass} ${className}`}
          style={{ width: size, height: size }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="rm-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="25%" stopColor="#eab308" />
              <stop offset="60%" stopColor="#a16207" />
              <stop offset="85%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <filter id="rm-glow">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#ca8a04" floodOpacity="0.7" />
            </filter>
          </defs>

          {/* Base Rim */}
          <circle cx="60" cy="60" r="48" fill="none" stroke="#713f12" strokeWidth="2.5" />

          {/* Layer 2: Main Polished Gold Crown Ring */}
          <circle
            cx="60"
            cy="60"
            r="49.5"
            fill="none"
            stroke="url(#rm-gold)"
            strokeWidth="3.2"
            filter="url(#rm-glow)"
          />

          {/* Royal Crest Laurel / Crown Peaks */}
          <g filter="url(#rm-glow)" className={animated ? "origin-center animate-[pulse_3s_ease-in-out_infinite]" : ""}>
            {/* Top Crown Tiara */}
            <polygon points="60,2 64,8 60,7 56,8" fill="url(#rm-gold)" />
            <polygon points="50,5 53,10 49,9" fill="url(#rm-gold)" />
            <polygon points="70,5 71,9 67,10" fill="url(#rm-gold)" />

            {/* Bottom Laurel Anchor */}
            <polygon points="60,118 64,112 60,113 56,112" fill="url(#rm-gold)" />

            {/* Side Crests */}
            <polygon points="2,60 8,56 7,60 8,64" fill="url(#rm-gold)" />
            <polygon points="118,60 112,56 113,60 112,64" fill="url(#rm-gold)" />
          </g>

          {/* Micro Pearl Accents */}
          <g className={animated ? "origin-center animate-[spin_40s_linear_infinite]" : ""}>
            <circle cx="60" cy="60" r="53" fill="none" stroke="#fde047" strokeWidth="1" strokeDasharray="2 18" />
          </g>
        </svg>
      );

    case "digital-storm":
      return (
        <svg
          viewBox="0 0 120 120"
          className={`w-full h-full overflow-visible pointer-events-none ${animClass} ${className}`}
          style={{ width: size, height: size }}
          aria-hidden="true"
        >
          <defs>
            <filter id="ds-glow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Layer 3: Ambient Arc Bloom */}
          <circle
            cx="60"
            cy="60"
            r="49"
            fill="none"
            stroke="#2563eb"
            strokeWidth="4"
            opacity="0.3"
            filter="url(#ds-glow)"
          />

          {/* Layer 2: Fast Spinning Lightning Conduit */}
          <g className={animated ? "origin-center animate-[spin_4s_linear_infinite]" : ""}>
            <circle
              cx="60"
              cy="60"
              r="49"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeDasharray="25 15 10 10 35 15"
              strokeLinecap="round"
              filter="url(#ds-glow)"
            />
            {/* Spark Arcs */}
            <polyline points="58,9 62,11 60,15 64,17" fill="none" stroke="#ffffff" strokeWidth="1.5" />
            <polyline points="62,111 58,109 60,105 56,103" fill="none" stroke="#ffffff" strokeWidth="1.5" />
          </g>

          {/* Reverse Orbiting Plasma Particles */}
          <g className={animated ? "origin-center animate-[spin_7s_linear_infinite_reverse]" : ""}>
            <circle cx="60" cy="6" r="2.2" fill="#93c5fd" filter="url(#ds-glow)" />
            <circle cx="114" cy="60" r="2.6" fill="#38bdf8" filter="url(#ds-glow)" />
            <circle cx="60" cy="114" r="2.2" fill="#93c5fd" filter="url(#ds-glow)" />
            <circle cx="6" cy="60" r="2.6" fill="#38bdf8" filter="url(#ds-glow)" />
          </g>
        </svg>
      );

    case "minimal-premium":
      return (
        <svg
          viewBox="0 0 120 120"
          className={`w-full h-full overflow-visible pointer-events-none ${animClass} ${className}`}
          style={{ width: size, height: size }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="mp-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
          </defs>

          {/* Inner Hairline Ring */}
          <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(148, 163, 184, 0.4)" strokeWidth="1" />

          {/* Outer Precision Hairline Ring */}
          <circle cx="60" cy="60" r="51.5" fill="none" stroke="url(#mp-grad)" strokeWidth="1.4" />

          {/* Orbiting Apex Precision Dot */}
          <g className={animated ? "origin-center animate-[spin_16s_linear_infinite]" : ""}>
            <circle cx="60" cy="8.5" r="2.4" fill="#ffffff" />
            <circle cx="60" cy="8.5" r="4.5" fill="none" stroke="#94a3b8" strokeWidth="0.8" opacity="0.6" />
          </g>
        </svg>
      );

    default:
      return null;
  }
}
