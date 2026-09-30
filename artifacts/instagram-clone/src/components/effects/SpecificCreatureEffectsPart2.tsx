import React from "react";
import { type ProfileEffectMetadata } from "./ProfileEffects";
import { cn } from "@/lib/utils";

export interface CreatureEffectProps {
  effect: ProfileEffectMetadata;
  isReducedMotion: boolean;
  particleCount: number;
  pointerOffset: { x: number; y: number };
  effectiveTier: "low" | "medium" | "high";
  variant: "full" | "compact" | "card";
}

// ─────────────────────────────────────────────────────────────
// 21. INFERNAL WYRM
// ─────────────────────────────────────────────────────────────
export function InfernalWyrmEffect({
  effect,
  isReducedMotion,
  particleCount,
  pointerOffset,
}: CreatureEffectProps) {
  const { colors } = effect;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className={cn(
          "absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out",
          !isReducedMotion && "animate-[dragon-float-slow_9s_ease-in-out_infinite]"
        )}
        style={{
          transform: !isReducedMotion
            ? `translate3d(${pointerOffset.x * 0.4}px, ${pointerOffset.y * 0.3}px, 0)`
            : "none",
        }}
      >
        <svg
          viewBox="0 0 800 360"
          className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible"
          preserveAspectRatio="xMidYMin meet"
        >
          <defs>
            <linearGradient id="infernal-wyrm-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.85" />
              <stop offset="40%" stopColor="#f97316" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#431407" stopOpacity="0.15" />
            </linearGradient>
            <filter id="infernal-wyrm-glow">
              <feGaussianBlur stdDeviation="5" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Wyrm Dorsal Basalt Spines & Flapping Body */}
          <g className={cn(!isReducedMotion && "animate-[dragon-wing-left_6s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 180px" }}>
            <path
              d="M 160 220 Q 280 90 400 135 Q 520 90 640 220 Q 510 160 400 180 Q 290 160 160 220 Z"
              fill="url(#infernal-wyrm-grad)"
              stroke="#f97316"
              strokeWidth="1.5"
              strokeOpacity="0.5"
            />
          </g>

          {/* Magma Fissure Veins (Breathing Glow) */}
          <g className={cn(!isReducedMotion && "animate-[dragon-breathe_4s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 150px" }}>
            <polyline
              points="340,90 370,130 350,165 400,195 450,165 430,130 460,90"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeOpacity="0.8"
              filter="url(#infernal-wyrm-glow)"
            />
            <polygon points="400,75 425,120 400,160 375,120" fill="#f97316" fillOpacity="0.6" stroke="#fbbf24" strokeWidth="1" />
          </g>
        </svg>
      </div>

      <div
        className="absolute top-2 inset-x-0 h-64 opacity-50 filter blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}88 50%, transparent 85%)` }}
      />

      {Array.from({ length: particleCount }).map((_, i) => (
        <span
          key={i}
          className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3s_ease-in-out_infinite]")}
          style={
            {
              left: `${(i * 20 + 8) % 94}%`,
              top: `${(i * 22 + 7) % 65}%`,
              width: `${(i % 3 === 0) ? 3.2 : 1.6}px`,
              height: `${(i % 3 === 0) ? 3.2 : 1.6}px`,
              backgroundColor: colors.particles,
              boxShadow: `0 0 10px ${colors.glow}`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 22. FROSTFIRE DRAGON
// ─────────────────────────────────────────────────────────────
export function FrostfireDragonEffect({
  effect,
  isReducedMotion,
  particleCount,
  pointerOffset,
}: CreatureEffectProps) {
  const { colors } = effect;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className={cn(
          "absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out",
          !isReducedMotion && "animate-[dragon-float-slow_9.5s_ease-in-out_infinite]"
        )}
        style={{
          transform: !isReducedMotion
            ? `translate3d(${pointerOffset.x * 0.4}px, ${pointerOffset.y * 0.3}px, 0)`
            : "none",
        }}
      >
        <svg
          viewBox="0 0 800 360"
          className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible"
          preserveAspectRatio="xMidYMin meet"
        >
          <defs>
            <linearGradient id="frostfire-dual-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
            </linearGradient>
            <filter id="frostfire-glow"><feGaussianBlur stdDeviation="5" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          {/* Dual Ice Icicles & Azure Wings */}
          <g className={cn(!isReducedMotion && "animate-[dragon-wing-left_6.5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 150px" }}>
            <path
              d="M 120 180 Q 260 50 400 110 Q 540 50 680 180 Q 520 120 400 150 Q 280 120 120 180 Z"
              fill="url(#frostfire-dual-grad)"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeOpacity="0.5"
            />
          </g>

          <g className={cn(!isReducedMotion && "animate-[dragon-head-tilt_8s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 150px" }}>
            <polygon points="400,80 420,110 400,150 380,110" fill="#38bdf8" fillOpacity="0.5" filter="url(#frostfire-glow)" />
          </g>
        </svg>
      </div>

      <div className="absolute top-2 inset-x-0 h-64 opacity-45 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}77 50%, transparent 85%)` }} />

      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3.5s_ease-in-out_infinite]")} style={{ left: `${(i * 20 + 8) % 94}%`, top: `${(i * 22 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3.2 : 1.6}px`, height: `${(i % 3 === 0) ? 3.2 : 1.6}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 23. EMERALD ANCIENT
// ─────────────────────────────────────────────────────────────
export function EmeraldAncientEffect({ effect, isReducedMotion, particleCount, pointerOffset }: CreatureEffectProps) {
  const { colors } = effect;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_10s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.35}px, ${pointerOffset.y * 0.25}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <g className={cn(!isReducedMotion && "animate-[dragon-crest-sway_9s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 140px" }}>
            <circle cx="400" cy="140" r="50" fill="none" stroke="#10b981" strokeWidth="2" strokeOpacity="0.6" />
            <polygon points="400,80 420,120 400,160 380,120" fill="#34d399" fillOpacity="0.4" />
          </g>
        </svg>
      </div>
      <div className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}77 50%, transparent 85%)` }} />
      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3.8s_ease-in-out_infinite]")} style={{ left: `${(i * 21 + 8) % 94}%`, top: `${(i * 19 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 24. LUNAR DRAGON
// ─────────────────────────────────────────────────────────────
export function LunarDragonEffect({ effect, isReducedMotion, particleCount, pointerOffset }: CreatureEffectProps) {
  const { colors } = effect;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_10.5s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.4}px, ${pointerOffset.y * 0.3}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <g className={cn(!isReducedMotion && "animate-[dragon-wing-left_6.5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 140px" }}>
            <path d="M 120 180 Q 260 50 400 110 Q 540 50 680 180 Q 520 120 400 150 Q 280 120 120 180 Z" fill="none" stroke="#cbd5e1" strokeWidth="1.8" strokeOpacity="0.5" />
            <circle cx="400" cy="110" r="30" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeOpacity="0.6" />
          </g>
        </svg>
      </div>
      <div className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}77 50%, transparent 85%)` }} />
      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_4s_ease-in-out_infinite]")} style={{ left: `${(i * 20 + 8) % 94}%`, top: `${(i * 21 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 25. THUNDER DRAKE
// ─────────────────────────────────────────────────────────────
export function ThunderDrakeEffect({ effect, isReducedMotion, particleCount, pointerOffset }: CreatureEffectProps) {
  const { colors } = effect;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_8.5s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.4}px, ${pointerOffset.y * 0.3}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <g className={cn(!isReducedMotion && "animate-[dragon-head-tilt_7.5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 140px" }}>
            <polyline points="330,80 360,120 400,160 440,120 470,80" fill="none" stroke="#facc15" strokeWidth="2" strokeOpacity="0.8" />
          </g>
        </svg>
      </div>
      <div className="absolute top-2 inset-x-0 h-60 opacity-45 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}77 50%, transparent 85%)` }} />
      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_2.8s_ease-in-out_infinite]")} style={{ left: `${(i * 20 + 8) % 94}%`, top: `${(i * 21 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 10px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 26. SILVER WOLF
// ─────────────────────────────────────────────────────────────
export function SilverWolfEffect({ effect, isReducedMotion, particleCount, pointerOffset }: CreatureEffectProps) {
  const { colors } = effect;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_9.5s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.35}px, ${pointerOffset.y * 0.25}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <g className={cn(!isReducedMotion && "animate-[dragon-head-tilt_8s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 160px" }}>
            <path d="M 330 110 L 350 60 L 375 110 L 425 110 L 450 60 L 470 110 Q 520 180 470 240 L 400 270 L 330 240 Z" fill="none" stroke="#94a3b8" strokeWidth="1.4" strokeOpacity="0.6" />
          </g>
        </svg>
      </div>
      <div className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}66 50%, transparent 85%)` }} />
      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3.6s_ease-in-out_infinite]")} style={{ left: `${(i * 21 + 8) % 94}%`, top: `${(i * 19 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 27. CRIMSON TIGER
// ─────────────────────────────────────────────────────────────
export function CrimsonTigerEffect({ effect, isReducedMotion, particleCount, pointerOffset }: CreatureEffectProps) {
  const { colors } = effect;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_9s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.35}px, ${pointerOffset.y * 0.25}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <g className={cn(!isReducedMotion && "animate-[dragon-breathe_4.5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 170px" }}>
            <path d="M 320 120 Q 400 90 480 120 Q 500 180 470 230 Q 400 270 330 230 Z" fill="none" stroke="#ef4444" strokeWidth="1.6" strokeOpacity="0.6" />
          </g>
        </svg>
      </div>
      <div className="absolute top-2 inset-x-0 h-60 opacity-45 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}77 50%, transparent 85%)` }} />
      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3.2s_ease-in-out_infinite]")} style={{ left: `${(i * 20 + 8) % 94}%`, top: `${(i * 21 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 10px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 28. ARCTIC FOX
// ─────────────────────────────────────────────────────────────
export function ArcticFoxEffect({ effect, isReducedMotion, particleCount, pointerOffset }: CreatureEffectProps) {
  const { colors } = effect;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_9.5s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.3}px, ${pointerOffset.y * 0.25}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <g className={cn(!isReducedMotion && "animate-[dragon-head-tilt_8s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 160px" }}>
            <path d="M 340 110 L 360 65 L 380 110 L 420 110 L 440 65 L 460 110 Q 490 170 450 220 L 400 250 L 350 220 Z" fill="none" stroke="#38bdf8" strokeWidth="1.4" strokeOpacity="0.5" />
          </g>
        </svg>
      </div>
      <div className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}66 50%, transparent 85%)` }} />
      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3.8s_ease-in-out_infinite]")} style={{ left: `${(i * 21 + 8) % 94}%`, top: `${(i * 19 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 29. NIGHT RAVEN
// ─────────────────────────────────────────────────────────────
export function NightRavenEffect({ effect, isReducedMotion, particleCount, pointerOffset }: CreatureEffectProps) {
  const { colors } = effect;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_8.5s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.4}px, ${pointerOffset.y * 0.3}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <g className={cn(!isReducedMotion && "animate-[dragon-wing-left_5.5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 140px" }}>
            <path d="M 80 170 Q 240 40 400 110 Q 560 40 720 170 Q 550 110 400 140 Q 250 110 80 170 Z" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeOpacity="0.5" />
          </g>
        </svg>
      </div>
      <div className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}66 50%, transparent 85%)` }} />
      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3.2s_ease-in-out_infinite]")} style={{ left: `${(i * 20 + 8) % 94}%`, top: `${(i * 21 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 30. SPIRIT STAG
// ─────────────────────────────────────────────────────────────
export function SpiritStagEffect({ effect, isReducedMotion, particleCount, pointerOffset }: CreatureEffectProps) {
  const { colors } = effect;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_9.5s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.35}px, ${pointerOffset.y * 0.25}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <g className={cn(!isReducedMotion && "animate-[dragon-head-tilt_8.5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 140px" }}>
            <path d="M 320 70 L 360 120 L 400 170 L 440 120 L 480 70" fill="none" stroke="#22c3ee" strokeWidth="1.8" strokeOpacity="0.6" />
          </g>
        </svg>
      </div>
      <div className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}66 50%, transparent 85%)` }} />
      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3.8s_ease-in-out_infinite]")} style={{ left: `${(i * 21 + 8) % 94}%`, top: `${(i * 19 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 31. MOON GRIFFIN
// ─────────────────────────────────────────────────────────────
export function MoonGriffinEffect({ effect, isReducedMotion, particleCount, pointerOffset }: CreatureEffectProps) {
  const { colors } = effect;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_9s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.4}px, ${pointerOffset.y * 0.3}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <g className={cn(!isReducedMotion && "animate-[dragon-wing-left_6s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 140px" }}>
            <path d="M 100 180 Q 250 40 400 110 Q 550 40 700 180 Q 540 100 400 140 Q 260 100 100 180 Z" fill="none" stroke="#e0e7ff" strokeWidth="1.6" strokeOpacity="0.5" />
          </g>
        </svg>
      </div>
      <div className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}66 50%, transparent 85%)` }} />
      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3.5s_ease-in-out_infinite]")} style={{ left: `${(i * 21 + 8) % 94}%`, top: `${(i * 19 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 32. CELESTIAL SERPENT
// ─────────────────────────────────────────────────────────────
export function CelestialSerpentEffect({ effect, isReducedMotion, particleCount, pointerOffset }: CreatureEffectProps) {
  const { colors } = effect;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_10s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.35}px, ${pointerOffset.y * 0.25}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <g className={cn(!isReducedMotion && "animate-[dragon-crest-sway_9s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 140px" }}>
            <path d="M 160 220 Q 280 80 400 130 Q 520 80 640 220" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeOpacity="0.6" strokeDasharray="10 6" />
          </g>
        </svg>
      </div>
      <div className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}66 50%, transparent 85%)` }} />
      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3.8s_ease-in-out_infinite]")} style={{ left: `${(i * 21 + 8) % 94}%`, top: `${(i * 19 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 33. EMBER PHOENIX
// ─────────────────────────────────────────────────────────────
export function EmberPhoenixEffect({ effect, isReducedMotion, particleCount, pointerOffset }: CreatureEffectProps) {
  const { colors } = effect;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_8s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.4}px, ${pointerOffset.y * 0.3}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <g className={cn(!isReducedMotion && "animate-[dragon-wing-left_5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 135px" }}>
            <path d="M 80 180 Q 240 30 400 100 Q 560 30 720 180 Q 550 100 400 135 Q 250 100 80 180 Z" fill="none" stroke="#f97316" strokeWidth="2" strokeOpacity="0.6" />
          </g>
        </svg>
      </div>
      <div className="absolute top-2 inset-x-0 h-60 opacity-45 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}77 50%, transparent 85%)` }} />
      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-85", !isReducedMotion && "animate-[dragon-ember-rise_2.8s_ease-in-out_infinite]")} style={{ left: `${(i * 20 + 9) % 94}%`, top: `${(i * 22 + 9) % 65}%`, width: `${(i % 3 === 0) ? 3.5 : 1.8}px`, height: `${(i % 3 === 0) ? 3.5 : 1.8}px`, backgroundColor: colors.particles, boxShadow: `0 0 10px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 34. STONE GUARDIAN
// ─────────────────────────────────────────────────────────────
export function StoneGuardianEffect({ effect, isReducedMotion, particleCount, pointerOffset }: CreatureEffectProps) {
  const { colors } = effect;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_11s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.3}px, ${pointerOffset.y * 0.2}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <g className={cn(!isReducedMotion && "animate-[dragon-breathe_5.5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 150px" }}>
            <polygon points="360,100 400,60 440,100 420,160 380,160" fill="none" stroke="#78716c" strokeWidth="2" strokeOpacity="0.6" />
          </g>
        </svg>
      </div>
      <div className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}66 50%, transparent 85%)` }} />
      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_4.2s_ease-in-out_infinite]")} style={{ left: `${(i * 21 + 8) % 94}%`, top: `${(i * 19 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 35. MYSTIC LEVIATHAN
// ─────────────────────────────────────────────────────────────
export function MysticLeviathanEffect({ effect, isReducedMotion, particleCount, pointerOffset }: CreatureEffectProps) {
  const { colors } = effect;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_10.5s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.35}px, ${pointerOffset.y * 0.25}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <g className={cn(!isReducedMotion && "animate-[dragon-crest-sway_9s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 140px" }}>
            <path d="M 180 200 Q 290 90 400 130 Q 510 90 620 200" fill="none" stroke="#818cf8" strokeWidth="2" strokeOpacity="0.6" />
          </g>
        </svg>
      </div>
      <div className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}66 50%, transparent 85%)` }} />
      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3.8s_ease-in-out_infinite]")} style={{ left: `${(i * 21 + 8) % 94}%`, top: `${(i * 19 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 36. ABYSS BEAST
// ─────────────────────────────────────────────────────────────
export function AbyssBeastEffect({ effect, isReducedMotion, particleCount, pointerOffset }: CreatureEffectProps) {
  const { colors } = effect;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_9.5s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.35}px, ${pointerOffset.y * 0.25}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <g className={cn(!isReducedMotion && "animate-[dragon-head-tilt_8s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 160px" }}>
            <path d="M 330 110 L 360 70 L 400 120 L 440 70 L 470 110 Q 500 180 400 240 Q 300 180 330 110 Z" fill="none" stroke="#a855f7" strokeWidth="1.6" strokeOpacity="0.6" />
          </g>
        </svg>
      </div>
      <div className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}66 50%, transparent 85%)` }} />
      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3.6s_ease-in-out_infinite]")} style={{ left: `${(i * 21 + 8) % 94}%`, top: `${(i * 19 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 37. SHADOW RAVEN
// ─────────────────────────────────────────────────────────────
export function ShadowRavenEffect({ effect, isReducedMotion, particleCount, pointerOffset }: CreatureEffectProps) {
  const { colors } = effect;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_8.5s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.4}px, ${pointerOffset.y * 0.3}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <g className={cn(!isReducedMotion && "animate-[dragon-wing-left_5.5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 140px" }}>
            <path d="M 80 170 Q 240 40 400 110 Q 560 40 720 170 Q 550 110 400 140 Q 250 110 80 170 Z" fill="none" stroke="#6366f1" strokeWidth="1.6" strokeOpacity="0.5" />
          </g>
        </svg>
      </div>
      <div className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}66 50%, transparent 85%)` }} />
      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3.2s_ease-in-out_infinite]")} style={{ left: `${(i * 20 + 8) % 94}%`, top: `${(i * 21 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 38. PHANTOM WOLF
// ─────────────────────────────────────────────────────────────
export function PhantomWolfEffect({ effect, isReducedMotion, particleCount, pointerOffset }: CreatureEffectProps) {
  const { colors } = effect;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_9.5s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.35}px, ${pointerOffset.y * 0.25}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <g className={cn(!isReducedMotion && "animate-[dragon-head-tilt_8s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 160px" }}>
            <path d="M 330 110 L 350 60 L 375 110 L 425 110 L 450 60 L 470 110 Q 520 180 470 240 L 400 270 L 330 240 Z" fill="none" stroke="#c084fc" strokeWidth="1.4" strokeOpacity="0.6" />
          </g>
        </svg>
      </div>
      <div className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}66 50%, transparent 85%)` }} />
      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3.6s_ease-in-out_infinite]")} style={{ left: `${(i * 21 + 8) % 94}%`, top: `${(i * 19 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 39. VOID GUARDIAN
// ─────────────────────────────────────────────────────────────
export function VoidGuardianEffect({ effect, isReducedMotion, particleCount, pointerOffset }: CreatureEffectProps) {
  const { colors } = effect;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_10s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.35}px, ${pointerOffset.y * 0.25}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <g className={cn(!isReducedMotion && "animate-[dragon-breathe_5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 140px" }}>
            <circle cx="400" cy="140" r="45" fill="none" stroke="#a855f7" strokeWidth="2" strokeOpacity="0.7" />
          </g>
        </svg>
      </div>
      <div className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}66 50%, transparent 85%)` }} />
      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3.8s_ease-in-out_infinite]")} style={{ left: `${(i * 21 + 8) % 94}%`, top: `${(i * 19 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 40. ECLIPSE DRAGON
// ─────────────────────────────────────────────────────────────
export function EclipseDragonEffect({ effect, isReducedMotion, particleCount, pointerOffset }: CreatureEffectProps) {
  const { colors } = effect;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_9.5s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.4}px, ${pointerOffset.y * 0.3}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <g className={cn(!isReducedMotion && "animate-[dragon-wing-left_6.5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 140px" }}>
            <path d="M 120 180 Q 260 50 400 110 Q 540 50 680 180 Q 520 120 400 150 Q 280 120 120 180 Z" fill="none" stroke="#f43f5e" strokeWidth="1.8" strokeOpacity="0.6" />
            <circle cx="400" cy="110" r="32" fill="#09090b" stroke="#fbbf24" strokeWidth="1.8" />
          </g>
        </svg>
      </div>
      <div className="absolute top-2 inset-x-0 h-60 opacity-45 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}77 50%, transparent 85%)` }} />
      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3.5s_ease-in-out_infinite]")} style={{ left: `${(i * 20 + 8) % 94}%`, top: `${(i * 21 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 10px ${colors.glow}` }} />
      ))}
    </div>
  );
}
