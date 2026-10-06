import React, { useEffect, useState, useRef, useMemo } from "react";
import { getProfileEffectById, type ProfileEffectMetadata } from "./ProfileEffects";
import { cn } from "@/lib/utils";
import {
  EmeraldDragonEffect,
  InfernoDragonEffect,
  ShadowDragonEffect,
  StormDragonEffect,
  CelestialDragonEffect,
  RoyalLionEffect,
  ShadowPantherEffect,
  SpiritWolfEffect,
  ArcticWolfEffect,
  GoldenEagleEffect,
  PhoenixRebirthEffect,
  CelestialPegasusEffect,
  LeviathanAbyssEffect,
  FrostGriffinEffect,
  SolarBasiliskEffect,
  SingularityHorizonEffect,
  CyberDragonEffect,
  VoidSovereignEffect,
  QuantumPhantomEffect,
  SupernovaCoreEffect,
} from "./SpecificCreatureEffects";
import {
  InfernalWyrmEffect,
  FrostfireDragonEffect,
  EmeraldAncientEffect,
  LunarDragonEffect,
  ThunderDrakeEffect,
  SilverWolfEffect,
  CrimsonTigerEffect,
  ArcticFoxEffect,
  NightRavenEffect,
  SpiritStagEffect,
  MoonGriffinEffect,
  CelestialSerpentEffect,
  EmberPhoenixEffect,
  StoneGuardianEffect,
  MysticLeviathanEffect,
  AbyssBeastEffect,
  ShadowRavenEffect,
  PhantomWolfEffect,
  VoidGuardianEffect,
  EclipseDragonEffect,
} from "./SpecificCreatureEffectsPart2";

export interface ProfileEffectRendererProps {
  effectId: string;
  variant?: "full" | "compact" | "card";
  performanceTier?: "auto" | "low" | "medium" | "high";
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

class ProfileEffectErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ProfileEffectRenderer caught rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export function ProfileEffectRenderer(props: ProfileEffectRendererProps) {
  return (
    <ProfileEffectErrorBoundary>
      <ProfileEffectRendererInner {...props} />
    </ProfileEffectErrorBoundary>
  );
}

function ProfileEffectRendererInner({
  effectId,
  variant = "full",
  performanceTier = "auto",
  interactive = true,
  className = "",
  style = {},
}: ProfileEffectRendererProps) {
  const effect = getProfileEffectById(effectId);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parallax offsets
  const [pointerOffset, setPointerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [effectiveTier, setEffectiveTier] = useState<"low" | "medium" | "high">("medium");

  // Detect reduced motion & hardware capability
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleMotionChange);

    // Compute effective tier
    if (performanceTier !== "auto") {
      setEffectiveTier(performanceTier);
    } else {
      const isMobile = window.innerWidth < 768 || "ontouchstart" in window;
      const cores = navigator.hardwareConcurrency || 4;
      if (isMobile || cores <= 2) {
        setEffectiveTier("low");
      } else if (cores <= 4) {
        setEffectiveTier("medium");
      } else {
        setEffectiveTier("high");
      }
    }

    return () => {
      mediaQuery.removeEventListener("change", handleMotionChange);
    };
  }, [performanceTier]);

  // Pointer parallax (damped requestAnimationFrame, only on desktop in high/medium tier)
  useEffect(() => {
    if (!interactive || isReducedMotion || effectiveTier === "low" || variant === "card") return;
    if (typeof window === "undefined" || window.innerWidth < 768) return;

    let rafId: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      targetX = (e.clientX / innerWidth - 0.5) * 20; // Max 20px shift
      targetY = (e.clientY / innerHeight - 0.5) * 15; // Max 15px shift
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      setPointerOffset({ x: currentX, y: currentY });
      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, [interactive, isReducedMotion, effectiveTier, variant]);

  if (!effect) return null;

  const { colors, animationType } = effect;
  const isCompact = variant === "compact";
  const isCard = variant === "card";

  // Particle count based on tier & variant
  const particleCount = useMemo(() => {
    if (isReducedMotion || effectiveTier === "low") return isCard ? 3 : 6;
    if (effectiveTier === "medium") return isCard ? 6 : 12;
    return isCard ? 10 : 22; // High tier
  }, [effectiveTier, isCard, isReducedMotion]);

  // Height sizing
  const containerHeightClass = "w-full h-full";

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={style}
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none select-none z-0 transition-opacity duration-700",
        containerHeightClass,
        className
      )}
    >
      {/* ── LAYER 1: BASE BACKGROUND TINT ───────────────────────── */}
      <div
        className="absolute inset-0 opacity-80 transition-colors duration-700"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${colors.primary}55 0%, ${colors.secondary}22 60%, transparent 100%)`,
        }}
      />

      {/* ── LAYER 2: AMBIENT ANIMATED GRADIENT MESH ────────────── */}
      <div
        style={{
          transform: !isReducedMotion
            ? `translate3d(${pointerOffset.x * 0.8}px, ${pointerOffset.y * 0.8}px, 0)`
            : "none",
        }}
        className={cn(
          "absolute -inset-10 opacity-95 blur-2xl transition-transform duration-300 ease-out will-change-transform",
          !isReducedMotion && animationType === "wave" && "animate-[pulse_10s_ease-in-out_infinite]",
          !isReducedMotion && animationType === "pulse" && "animate-[pulse_6s_ease-in-out_infinite]"
        )}
      >
        {/* Blob 1: Primary Key Light */}
        <div
          className="absolute w-[450px] sm:w-[650px] h-[350px] sm:h-[450px] rounded-full mix-blend-screen opacity-90 filter blur-xl"
          style={{
            top: "0%",
            left: "10%",
            background: `radial-gradient(circle, ${colors.primary} 0%, ${colors.secondary}88 65%, transparent 100%)`,
          }}
        />

        {/* Blob 2: Secondary Fill Light */}
        <div
          className="absolute w-[400px] sm:w-[550px] h-[300px] sm:h-[400px] rounded-full mix-blend-screen opacity-80 filter blur-2xl"
          style={{
            top: "10%",
            right: "5%",
            background: `radial-gradient(circle, ${colors.accent} 0%, ${colors.secondary}66 70%, transparent 100%)`,
          }}
        />

        {/* Blob 3: Center Ambient Glow Accent */}
        <div
          className="absolute w-[300px] sm:w-[480px] h-[220px] sm:h-[320px] rounded-full mix-blend-color-dodge opacity-85 filter blur-xl"
          style={{
            top: "5%",
            left: "35%",
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 80%)`,
          }}
        />
      </div>

      {/* ── LAYER 3: LIGHT BLOOM & RADIAL FOCUS ────────────────── */}
      <div
        className="absolute inset-x-0 top-0 h-[85%] opacity-80 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 70% at 50% 20%, ${colors.glow} 0%, transparent 100%)`,
        }}
      />

      {/* ── LAYER 4 & 5: SPECIFIC EFFECT VISUAL COMPOSITION ────── */}
      <SpecificEffectLayers
        effect={effect}
        isReducedMotion={isReducedMotion}
        particleCount={particleCount}
        pointerOffset={pointerOffset}
        effectiveTier={effectiveTier}
        variant={variant}
      />

      {/* ── LAYER 6: INTERACTIVE REFRACTION SHEEN (High Tier) ──── */}
      {effectiveTier === "high" && !isReducedMotion && !isCard && (
        <div
          className="absolute inset-0 opacity-35 mix-blend-overlay pointer-events-none"
          style={{
            background: `linear-gradient(${115 + pointerOffset.x * 2}deg, transparent 20%, ${colors.accent}77 50%, transparent 80%)`,
            transform: `translate3d(${pointerOffset.x * -0.5}px, ${pointerOffset.y * -0.5}px, 0)`,
          }}
        />
      )}

      {/* ── LAYER 7: BOTTOM CONTRAST VIGNETTE & FADE TO CARD ───── */}
      {/* Ensures 100% readability without obscuring effects in cards or banners */}
      {!isCard ? (
        <div
          className="absolute inset-x-0 bottom-0 h-20 sm:h-28 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(9, 14, 26, 0.15) 50%, rgba(9, 14, 26, 0.4) 100%)",
          }}
        />
      ) : (
        <div
          className="absolute inset-x-0 bottom-0 h-10 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(10, 14, 26, 0.3) 100%)",
          }}
        />
      )}

      {/* Top soft rim border */}
      <div
        className="absolute inset-x-0 top-0 h-[1px] opacity-35"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${colors.accent} 50%, transparent 100%)`,
        }}
      />
    </div>
  );
}

// ── INDIVIDUAL CUSTOM EFFECT LAYER RENDERER ───────────────────────────────
interface SpecificEffectProps {
  effect: ProfileEffectMetadata;
  isReducedMotion: boolean;
  particleCount: number;
  pointerOffset: { x: number; y: number };
  effectiveTier: "low" | "medium" | "high";
  variant: "full" | "compact" | "card";
}

function SpecificEffectLayers({
  effect,
  isReducedMotion,
  particleCount,
  pointerOffset,
  effectiveTier,
  variant,
}: SpecificEffectProps) {
  const { id, colors, animationType } = effect;

  switch (id) {
    // ── 1. EMERALD AURORA (WhiterChat Signature) ───────────────────────
    case "emerald-aurora":
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Undulating Aurora Wave 1 */}
          <div
            className={cn(
              "absolute inset-x-[-15%] top-0 h-72 opacity-60 filter blur-xl",
              !isReducedMotion && "animate-[pulse_8s_ease-in-out_infinite]"
            )}
            style={{
              background: `radial-gradient(ellipse 65% 55% at 45% 20%, ${colors.primary} 0%, ${colors.secondary}66 50%, transparent 85%)`,
              transform: !isReducedMotion
                ? `translate3d(${pointerOffset.x * 0.5}px, ${pointerOffset.y * 0.4}px, 0) scale(1.05)`
                : "none",
            }}
          />

          {/* Undulating Aurora Wave 2 */}
          <div
            className={cn(
              "absolute inset-x-[-10%] top-6 h-60 opacity-45 filter blur-2xl",
              !isReducedMotion && "animate-[pulse_12s_ease-in-out_infinite_reverse]"
            )}
            style={{
              background: `radial-gradient(ellipse 75% 45% at 55% 30%, ${colors.accent} 0%, transparent 75%)`,
            }}
          />

          {/* Emerald Atmospheric Particle Dust */}
          {Array.from({ length: particleCount }).map((_, i) => {
            const left = (i * 17 + 7) % 94;
            const top = (i * 23 + 5) % 65;
            const size = (i % 3) + 2;
            const dur = 4 + (i % 5);
            return (
              <span
                key={i}
                className={cn(
                  "absolute rounded-full pointer-events-none opacity-60",
                  !isReducedMotion && "animate-[pulse_var(--dur)_ease-in-out_infinite]"
                )}
                style={
                  {
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: colors.particles,
                    boxShadow: `0 0 ${size * 3}px ${colors.glow}`,
                    "--dur": `${dur}s`,
                  } as React.CSSProperties
                }
              />
            );
          })}
        </div>
      );

    // ── 2. CYBER PULSE ────────────────────────────────────────────────
    case "cyber-pulse":
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Tactical Horizon Grid */}
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage: `linear-gradient(${colors.accent}26 1px, transparent 1px), linear-gradient(90deg, ${colors.accent}26 1px, transparent 1px)`,
              backgroundSize: variant === "card" ? "24px 24px" : "36px 36px",
              perspective: "500px",
              transform: `rotateX(45deg) translate3d(0, ${pointerOffset.y * 0.6}px, 0)`,
              transformOrigin: "center top",
            }}
          />

          {/* Roaming Cyan Horizon Scanline */}
          {!isReducedMotion && (
            <div
              className="absolute inset-x-0 h-[2px] opacity-70 animate-[pulse_4s_linear_infinite]"
              style={{
                top: "35%",
                background: `linear-gradient(90deg, transparent 0%, ${colors.accent} 50%, transparent 100%)`,
                boxShadow: `0 0 12px ${colors.glow}`,
              }}
            />
          )}

          {/* Telemetry Corner Accents */}
          <div className="absolute top-4 left-6 text-[10px] font-mono tracking-widest text-cyan-400/40 uppercase">
            [SYS // WHITER_TELEMETRY: ONLINE]
          </div>
          <div className="absolute top-4 right-6 text-[10px] font-mono tracking-widest text-cyan-400/40 uppercase">
            [FREQ // 94.8 MHz]
          </div>
        </div>
      );

    // ── 3. COSMIC ORBIT ───────────────────────────────────────────────
    case "cosmic-orbit":
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Dual Celestial Orbital Rings SVG */}
          <svg
            className="absolute inset-0 w-full h-full opacity-35 overflow-visible"
            viewBox="0 0 800 400"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <linearGradient id="cosmic-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.primary} stopOpacity="0.8" />
                <stop offset="50%" stopColor={colors.accent} stopOpacity="0.3" />
                <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Inner Ring */}
            <ellipse
              cx="400"
              cy="160"
              rx="320"
              ry="90"
              fill="none"
              stroke="url(#cosmic-ring-grad)"
              strokeWidth="1.5"
              strokeDasharray="18 10 30 14"
              transform={`rotate(-8 400 160)`}
            />

            {/* Outer Ring */}
            <ellipse
              cx="400"
              cy="160"
              rx="440"
              ry="125"
              fill="none"
              stroke={colors.accent}
              strokeOpacity="0.35"
              strokeWidth="1"
              strokeDasharray="40 20"
              transform={`rotate(12 400 160)`}
            />
          </svg>

          {/* Twinkling Celestial Starfield */}
          {Array.from({ length: particleCount }).map((_, i) => {
            const left = (i * 21 + 5) % 96;
            const top = (i * 19 + 8) % 70;
            const size = (i % 3) === 0 ? 3 : 1.5;
            return (
              <span
                key={i}
                className={cn(
                  "absolute rounded-full pointer-events-none",
                  !isReducedMotion && (i % 2 === 0 ? "animate-pulse" : "animate-[ping_3s_ease-in-out_infinite]")
                )}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: colors.particles,
                  boxShadow: `0 0 6px ${colors.glow}`,
                }}
              />
            );
          })}
        </div>
      );

    // ── 4. HOLOGRAPHIC ATMOSPHERE (Prism) ──────────────────────────────
    case "holographic-atmosphere":
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Dynamic Prismatic Angle Sweep */}
          <div
            className={cn(
              "absolute -inset-16 opacity-35 mix-blend-color-dodge filter blur-xl",
              !isReducedMotion && "animate-[pulse_7s_ease-in-out_infinite]"
            )}
            style={{
              background: `conic-gradient(from ${pointerOffset.x * 2}deg at 50% 30%, ${colors.primary}, ${colors.secondary}, ${colors.accent}, ${colors.primary})`,
              transform: `translate3d(${pointerOffset.x * 0.4}px, 0, 0)`,
            }}
          />

          {/* Holographic Dispersion Rays */}
          <div
            className="absolute inset-x-0 top-0 h-72 opacity-25"
            style={{
              background: `repeating-linear-gradient(75deg, transparent, transparent 30px, ${colors.accent}15 30px, ${colors.accent}15 60px)`,
            }}
          />
        </div>
      );

    // ── 5. BLACK CHROME ───────────────────────────────────────────────
    case "black-chrome":
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Obsidian Bevel Reflection Beams */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: `linear-gradient(${125 + pointerOffset.x}deg, rgba(255,255,255,0.08) 0%, transparent 35%, rgba(255,255,255,0.12) 50%, transparent 65%)`,
            }}
          />
          {/* Diagonal Carbon Mesh Sheen */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />
        </div>
      );

    // ── 6. DIGITAL RAIN ───────────────────────────────────────────────
    case "digital-rain":
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Vertical Matrix Data Columns */}
          <div className="flex justify-around items-start w-full h-full opacity-35 px-4">
            {Array.from({ length: variant === "card" ? 6 : 14 }).map((_, col) => {
              const height = 40 + ((col * 17) % 55);
              const delay = (col * 0.3) % 2;
              return (
                <div
                  key={col}
                  className="w-[1.5px] rounded-full"
                  style={{
                    height: `${height}%`,
                    background: `linear-gradient(to bottom, transparent, ${colors.primary} 70%, #ffffff 100%)`,
                    boxShadow: `0 0 8px ${colors.glow}`,
                    animation: !isReducedMotion ? `bounce 4s ease-in-out infinite ${delay}s` : "none",
                  }}
                />
              );
            })}
          </div>
        </div>
      );

    // ── 7. NEON ENERGY ────────────────────────────────────────────────
    case "neon-energy":
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Topographic Neon Energy Contour */}
          <svg className="absolute inset-0 w-full h-64 opacity-40 overflow-visible" preserveAspectRatio="none" viewBox="0 0 600 200">
            <path
              d="M0,60 C150,140 350,10 600,80"
              fill="none"
              stroke={colors.accent}
              strokeWidth="2"
              strokeDasharray="12 6"
              filter="drop-shadow(0 0 8px rgba(45, 212, 191, 0.6))"
            />
            <path
              d="M0,110 C200,20 400,160 600,110"
              fill="none"
              stroke={colors.primary}
              strokeWidth="1.5"
              filter="drop-shadow(0 0 10px rgba(16, 185, 129, 0.5))"
            />
          </svg>
        </div>
      );

    // ── 8. STARFIELD VOID ─────────────────────────────────────────────
    case "starfield-void":
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Deep Space Star Clusters */}
          {Array.from({ length: particleCount }).map((_, i) => {
            const left = (i * 13 + 4) % 96;
            const top = (i * 27 + 6) % 75;
            const size = (i % 4 === 0) ? 2.5 : 1;
            const opacity = 0.3 + ((i % 5) * 0.14);
            return (
              <span
                key={i}
                className={cn("absolute rounded-full pointer-events-none", !isReducedMotion && "animate-pulse")}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: colors.particles,
                  opacity,
                  boxShadow: size > 1.5 ? `0 0 6px ${colors.glow}` : "none",
                }}
              />
            );
          })}
        </div>
      );

    // ── 9. GLASS LIGHT ────────────────────────────────────────────────
    case "glass-light":
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Diffused Glassmorphic Caustics */}
          <div
            className="absolute top-6 left-1/4 w-72 h-44 rounded-full opacity-25 filter blur-3xl"
            style={{ background: "radial-gradient(circle, #ffffff 0%, rgba(148, 163, 184, 0.4) 100%)" }}
          />
          <div
            className="absolute top-12 right-1/4 w-60 h-40 rounded-full opacity-20 filter blur-2xl"
            style={{ background: "radial-gradient(circle, #e2e8f0 0%, transparent 80%)" }}
          />
        </div>
      );

    // ── 10. DARK CRYSTAL ──────────────────────────────────────────────
    case "dark-crystal":
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Amethyst Prismatic Shard Facets */}
          <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 800 400" preserveAspectRatio="none">
            <polygon points="400,20 480,120 400,220 320,120" fill="none" stroke={colors.accent} strokeWidth="1.5" strokeOpacity="0.4" />
            <polygon points="200,60 250,140 180,190" fill="none" stroke={colors.primary} strokeWidth="1" strokeOpacity="0.3" />
            <polygon points="620,80 690,150 610,210" fill="none" stroke={colors.primary} strokeWidth="1" strokeOpacity="0.3" />
          </svg>
        </div>
      );

    // ── 11. LIQUID AURORA ─────────────────────────────────────────────
    case "liquid-aurora":
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Fluid Chromatic Waves */}
          <div
            className={cn(
              "absolute -inset-10 opacity-55 filter blur-2xl",
              !isReducedMotion && "animate-[pulse_9s_ease-in-out_infinite]"
            )}
            style={{
              background: `radial-gradient(ellipse 80% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary} 45%, ${colors.accent} 70%, transparent 95%)`,
              transform: `translate3d(${pointerOffset.x * 0.5}px, ${pointerOffset.y * 0.3}px, 0)`,
            }}
          />
        </div>
      );

    // ── 12. ROYAL AMBIENT ─────────────────────────────────────────────
    case "royal-ambient":
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* 24k Champagne Radiance */}
          <div
            className="absolute inset-x-0 top-0 h-64 opacity-50 filter blur-2xl"
            style={{
              background: `radial-gradient(ellipse 60% 45% at 50% 20%, ${colors.primary} 0%, ${colors.secondary}55 60%, transparent 90%)`,
            }}
          />
          {/* Gold Sparkle Motifs */}
          {Array.from({ length: particleCount }).map((_, i) => {
            const left = (i * 19 + 6) % 94;
            const top = (i * 23 + 4) % 65;
            const size = (i % 3 === 0) ? 2.5 : 1.5;
            return (
              <span
                key={i}
                className={cn("absolute rounded-full pointer-events-none opacity-70", !isReducedMotion && "animate-pulse")}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: colors.particles,
                  boxShadow: `0 0 8px ${colors.glow}`,
                }}
              />
            );
          })}
        </div>
      );

    // ── 5 DRAGONS ─────────────────────────────────────────────────────
    case "emerald-dragon":
      return (
        <EmeraldDragonEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "inferno-dragon":
      return (
        <InfernoDragonEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "shadow-dragon":
      return (
        <ShadowDragonEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "storm-dragon":
      return (
        <StormDragonEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "celestial-dragon":
      return (
        <CelestialDragonEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    // ── 5 ANIMALS ─────────────────────────────────────────────────────
    case "royal-lion":
      return (
        <RoyalLionEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "shadow-panther":
      return (
        <ShadowPantherEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "spirit-wolf":
      return (
        <SpiritWolfEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "arctic-wolf":
      return (
        <ArcticWolfEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "golden-eagle":
      return (
        <GoldenEagleEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    // ── 5 MYTHICAL CREATURES ──────────────────────────────────────────
    case "phoenix-rebirth":
      return (
        <PhoenixRebirthEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "celestial-pegasus":
      return (
        <CelestialPegasusEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "leviathan-abyss":
      return (
        <LeviathanAbyssEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "frost-griffin":
      return (
        <FrostGriffinEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "solar-basilisk":
      return (
        <SolarBasiliskEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    // ── 5 COSMIC / DARK ───────────────────────────────────────────────
    case "singularity-horizon":
      return (
        <SingularityHorizonEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "cyber-dragon":
      return (
        <CyberDragonEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "void-sovereign":
      return (
        <VoidSovereignEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "quantum-phantom":
      return (
        <QuantumPhantomEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "supernova-core":
      return (
        <SupernovaCoreEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    // ── NEW COLLECTION (21 to 40) ─────────────────────────────────────
    case "infernal-wyrm":
      return (
        <InfernalWyrmEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "frostfire-dragon":
      return (
        <FrostfireDragonEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "emerald-ancient":
      return (
        <EmeraldAncientEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "lunar-dragon":
      return (
        <LunarDragonEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "thunder-drake":
      return (
        <ThunderDrakeEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "silver-wolf":
      return (
        <SilverWolfEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "crimson-tiger":
      return (
        <CrimsonTigerEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "arctic-fox":
      return (
        <ArcticFoxEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "night-raven":
      return (
        <NightRavenEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "spirit-stag":
      return (
        <SpiritStagEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "moon-griffin":
      return (
        <MoonGriffinEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "celestial-serpent":
      return (
        <CelestialSerpentEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "ember-phoenix":
      return (
        <EmberPhoenixEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "stone-guardian":
      return (
        <StoneGuardianEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "mystic-leviathan":
      return (
        <MysticLeviathanEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "abyss-beast":
      return (
        <AbyssBeastEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "shadow-raven":
      return (
        <ShadowRavenEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "phantom-wolf":
      return (
        <PhantomWolfEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "void-guardian":
      return (
        <VoidGuardianEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    case "eclipse-dragon":
      return (
        <EclipseDragonEffect
          effect={effect}
          isReducedMotion={isReducedMotion}
          particleCount={particleCount}
          pointerOffset={pointerOffset}
          effectiveTier={effectiveTier}
          variant={variant}
        />
      );

    default:
      return null;
  }
}
