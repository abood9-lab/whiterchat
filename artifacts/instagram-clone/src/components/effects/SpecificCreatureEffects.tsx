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
// 1. EMERALD DRAGON
// ─────────────────────────────────────────────────────────────
export function EmeraldDragonEffect({
  effect,
  isReducedMotion,
  particleCount,
  pointerOffset,
}: CreatureEffectProps) {
  const { colors } = effect;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Floating Dragon Container */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 flex justify-center items-start transition-transform duration-700 ease-out",
          !isReducedMotion && "animate-[dragon-float-slow_10s_ease-in-out_infinite]"
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
            <linearGradient id="emerald-dragon-scales" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#065f46" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#022c22" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="emerald-wing-grad" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#34d399" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.35" />
            </linearGradient>
            <filter id="emerald-eye-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Dragon Wings Layer (Flapping & Sweeping) */}
          <g
            className={cn(!isReducedMotion && "animate-[dragon-wing-left_6s_ease-in-out_infinite]")}
            style={{ transformOrigin: "400px 170px" }}
          >
            <path
              d="M 120 180 Q 240 60 400 120 Q 560 60 680 180 Q 540 140 400 170 Q 260 140 120 180 Z"
              fill="url(#emerald-wing-grad)"
              className="opacity-60"
            />
            <path
              d="M 60 150 Q 220 20 400 90 Q 580 20 740 150 Q 560 90 400 130 Q 240 90 60 150 Z"
              fill="none"
              stroke="#34d399"
              strokeWidth="1.8"
              strokeOpacity="0.5"
            />
          </g>

          {/* Dragon Body & Chest (Breathing Expansion) */}
          <g
            className={cn(!isReducedMotion && "animate-[dragon-breathe_4.5s_ease-in-out_infinite]")}
            style={{ transformOrigin: "400px 220px" }}
          >
            <path
              d="M 400 150 Q 420 200 400 270 Q 380 200 400 150 Z"
              fill="url(#emerald-dragon-scales)"
              stroke="#34d399"
              strokeWidth="0.8"
              strokeOpacity="0.4"
            />
          </g>

          {/* Dragon Head, Horns & Visage (Head Tilt & Pointer Response) */}
          <g
            className={cn(!isReducedMotion && "animate-[dragon-head-tilt_8s_ease-in-out_infinite]")}
            style={{
              transformOrigin: "400px 170px",
              transform: !isReducedMotion ? `rotate(${pointerOffset.x * 0.15}deg)` : "none",
            }}
          >
            <path
              d="M 400 65 L 430 115 L 480 85 L 450 145 L 470 170 L 440 190 L 420 250 L 400 270 L 380 250 L 360 190 L 330 170 L 350 145 L 320 85 L 370 115 Z"
              fill="url(#emerald-dragon-scales)"
              stroke="#34d399"
              strokeWidth="1.2"
              strokeOpacity="0.6"
            />
            <path
              d="M 320 85 Q 360 120 380 170 M 480 85 Q 440 120 420 170"
              fill="none"
              stroke="#6ee7b7"
              strokeWidth="1.2"
              strokeOpacity="0.6"
            />

            <polygon points="400,150 412,175 400,200 388,175" fill="#34d399" fillOpacity="0.35" stroke="#6ee7b7" strokeWidth="0.8" />
            <polygon points="400,200 410,225 400,245 390,225" fill="#10b981" fillOpacity="0.3" stroke="#34d399" strokeWidth="0.8" />

            {/* Piercing Luminous Jade Eyes */}
            <g className={cn(!isReducedMotion && "animate-[dragon-eye-glow_3.5s_ease-in-out_infinite]")}>
              <ellipse cx="372" cy="180" rx="9" ry="4" transform="rotate(-15 372 180)" fill="#6ee7b7" filter="url(#emerald-eye-glow)" />
              <ellipse cx="428" cy="180" rx="9" ry="4" transform="rotate(15 428 180)" fill="#6ee7b7" filter="url(#emerald-eye-glow)" />
              <line x1="372" y1="177" x2="372" y2="183" stroke="#064e3b" strokeWidth="2" strokeLinecap="round" />
              <line x1="428" y1="177" x2="428" y2="183" stroke="#064e3b" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>
        </svg>
      </div>

      {/* Atmospheric Emerald Mist */}
      <div
        className={cn("absolute top-4 left-1/4 w-80 h-44 rounded-full opacity-35 filter blur-3xl", !isReducedMotion && "animate-[pulse_7s_ease-in-out_infinite]")}
        style={{ background: `radial-gradient(circle, ${colors.primary} 0%, transparent 70%)` }}
      />
      <div
        className={cn("absolute top-10 right-1/4 w-72 h-40 rounded-full opacity-25 filter blur-3xl", !isReducedMotion && "animate-[pulse_9s_ease-in-out_infinite]")}
        style={{ background: `radial-gradient(circle, ${colors.accent} 0%, transparent 70%)` }}
      />

      {/* Depth Particles */}
      {Array.from({ length: particleCount }).map((_, i) => {
        const left = (i * 18 + 9) % 94;
        const top = (i * 21 + 8) % 65;
        const size = (i % 3 === 0) ? 3.2 : 1.8;
        const dur = 3 + (i % 4);
        const depthFactor = 0.3 + (i % 3) * 0.25;
        return (
          <span
            key={i}
            className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_var(--dur)_ease-in-out_infinite]")}
            style={
              {
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: colors.particles,
                boxShadow: `0 0 10px ${colors.glow}`,
                "--dur": `${dur}s`,
                animationDelay: `${(i % 5) * 0.6}s`,
                transform: !isReducedMotion
                  ? `translate3d(${pointerOffset.x * depthFactor}px, ${pointerOffset.y * depthFactor}px, 0)`
                  : "none",
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. INFERNO DRAGON
// ─────────────────────────────────────────────────────────────
export function InfernoDragonEffect({
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
          "absolute inset-x-0 top-0 flex justify-center items-start opacity-85 transition-transform duration-700 ease-out",
          !isReducedMotion && "animate-[dragon-float-slow_9s_ease-in-out_infinite]"
        )}
        style={{
          transform: !isReducedMotion
            ? `translate3d(${pointerOffset.x * 0.35}px, ${pointerOffset.y * 0.25}px, 0)`
            : "none",
        }}
      >
        <svg
          viewBox="0 0 800 360"
          className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible"
          preserveAspectRatio="xMidYMin meet"
        >
          <defs>
            <linearGradient id="inferno-head-grad" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#ef4444" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#450a0a" stopOpacity="0.2" />
            </linearGradient>
            <filter id="inferno-fire-glow">
              <feGaussianBlur stdDeviation="6" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Sweeping Flame Wings */}
          <g className={cn(!isReducedMotion && "animate-[dragon-wing-left_5.5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 180px" }}>
            <path
              d="M 160 210 Q 280 80 400 140 Q 520 80 640 210 Q 510 160 400 180 Q 290 160 160 210 Z"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeOpacity="0.5"
              filter="url(#inferno-fire-glow)"
            />
            <path
              d="M 220 230 Q 310 120 400 160 Q 490 120 580 230"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeOpacity="0.6"
            />
          </g>

          {/* Molten Chest Breathing Core */}
          <g className={cn(!isReducedMotion && "animate-[dragon-breathe_4s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 220px" }}>
            <circle cx="400" cy="200" r="35" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.4" filter="url(#inferno-fire-glow)" />
          </g>

          {/* Molten Dragon Horns & Head */}
          <g className={cn(!isReducedMotion && "animate-[dragon-head-tilt_8.5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 180px" }}>
            <path
              d="M 400 70 L 435 125 L 495 90 L 460 155 L 485 180 L 445 200 L 420 260 L 400 280 L 380 260 L 355 200 L 315 180 L 340 155 L 305 90 L 365 125 Z"
              fill="url(#inferno-head-grad)"
              stroke="#f59e0b"
              strokeWidth="1.2"
              strokeOpacity="0.65"
            />

            {/* Molten Slit Eyes */}
            <g className={cn(!isReducedMotion && "animate-[dragon-eye-glow_3s_ease-in-out_infinite]")}>
              <ellipse cx="370" cy="185" rx="8" ry="4" transform="rotate(-18 370 185)" fill="#fef08a" filter="url(#inferno-fire-glow)" />
              <ellipse cx="430" cy="185" rx="8" ry="4" transform="rotate(18 430 185)" fill="#fef08a" filter="url(#inferno-fire-glow)" />
              <line x1="370" y1="182" x2="370" y2="188" stroke="#7f1d1d" strokeWidth="2" strokeLinecap="round" />
              <line x1="430" y1="182" x2="430" y2="188" stroke="#7f1d1d" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>
        </svg>
      </div>

      <div
        className="absolute top-2 inset-x-0 h-60 opacity-45 filter blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}77 45%, transparent 80%)` }}
      />

      {/* Ash & Burning Embers */}
      {Array.from({ length: particleCount }).map((_, i) => {
        const left = (i * 19 + 7) % 94;
        const top = (i * 23 + 12) % 65;
        const size = (i % 3 === 0) ? 3.5 : 1.8;
        const dur = 2.5 + (i % 3);
        return (
          <span
            key={i}
            className={cn("absolute rounded-full pointer-events-none opacity-85", !isReducedMotion && "animate-[dragon-ember-rise_var(--dur)_ease-in-out_infinite]")}
            style={
              {
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: colors.particles,
                boxShadow: `0 0 10px ${colors.glow}`,
                "--dur": `${dur}s`,
                animationDelay: `${(i % 4) * 0.5}s`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. SHADOW DRAGON
// ─────────────────────────────────────────────────────────────
export function ShadowDragonEffect({
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
          !isReducedMotion && "animate-[dragon-float-slow_11s_ease-in-out_infinite]"
        )}
        style={{
          transform: !isReducedMotion
            ? `translate3d(${pointerOffset.x * 0.35}px, ${pointerOffset.y * 0.3}px, 0)`
            : "none",
        }}
      >
        <svg
          viewBox="0 0 800 360"
          className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible"
          preserveAspectRatio="xMidYMin meet"
        >
          <defs>
            <linearGradient id="shadow-crest-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#581c87" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#09090b" stopOpacity="0.15" />
            </linearGradient>
            <filter id="shadow-eye-glow">
              <feGaussianBlur stdDeviation="5" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Ethereal Shadow Wings */}
          <g className={cn(!isReducedMotion && "animate-[dragon-wing-left_7s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 160px" }}>
            <path
              d="M 140 190 Q 270 40 400 110 Q 530 40 660 190 Q 520 130 400 160 Q 280 130 140 190 Z"
              fill="none"
              stroke="#c084fc"
              strokeWidth="2"
              strokeOpacity="0.45"
            />
          </g>

          {/* Breathing Core */}
          <g className={cn(!isReducedMotion && "animate-[dragon-breathe_5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 200px" }}>
            <ellipse cx="400" cy="200" rx="30" ry="20" fill="url(#shadow-crest-grad)" opacity="0.6" filter="url(#shadow-eye-glow)" />
          </g>

          {/* Obsidian Crown & Horns */}
          <g className={cn(!isReducedMotion && "animate-[dragon-head-tilt_9s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 170px" }}>
            <path
              d="M 400 65 L 430 120 L 485 75 L 450 145 L 475 170 L 440 195 L 418 255 L 400 270 L 382 255 L 360 195 L 325 170 L 350 145 L 315 75 L 370 120 Z"
              fill="url(#shadow-crest-grad)"
              stroke="#a855f7"
              strokeWidth="1.2"
              strokeOpacity="0.55"
            />

            {/* Piercing Amethyst Eyes */}
            <g className={cn(!isReducedMotion && "animate-[dragon-eye-glow_4s_ease-in-out_infinite]")}>
              <ellipse cx="372" cy="182" rx="8" ry="4" transform="rotate(-15 372 182)" fill="#e9d5ff" filter="url(#shadow-eye-glow)" />
              <ellipse cx="428" cy="182" rx="8" ry="4" transform="rotate(15 428 182)" fill="#e9d5ff" filter="url(#shadow-eye-glow)" />
              <line x1="372" y1="179" x2="372" y2="185" stroke="#3b0764" strokeWidth="2" strokeLinecap="round" />
              <line x1="428" y1="179" x2="428" y2="185" stroke="#3b0764" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>
        </svg>
      </div>

      <div
        className="absolute top-2 inset-x-0 h-56 opacity-40 filter blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}66 50%, transparent 85%)` }}
      />

      {/* Floating Void Motes */}
      {Array.from({ length: particleCount }).map((_, i) => {
        const left = (i * 21 + 11) % 94;
        const top = (i * 19 + 6) % 65;
        const size = (i % 3 === 0) ? 2.8 : 1.5;
        const dur = 3.5 + (i % 3);
        return (
          <span
            key={i}
            className={cn("absolute rounded-full pointer-events-none opacity-70", !isReducedMotion && "animate-[dragon-ember-rise_var(--dur)_ease-in-out_infinite]")}
            style={
              {
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: colors.particles,
                boxShadow: `0 0 8px ${colors.glow}`,
                "--dur": `${dur}s`,
                animationDelay: `${(i % 5) * 0.7}s`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. STORM DRAGON
// ─────────────────────────────────────────────────────────────
export function StormDragonEffect({
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
          !isReducedMotion && "animate-[dragon-float-slow_8.5s_ease-in-out_infinite]"
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
            <linearGradient id="storm-lightning-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#0284c7" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#082f49" stopOpacity="0.15" />
            </linearGradient>
            <filter id="storm-electric-glow">
              <feGaussianBlur stdDeviation="5" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Electric Horns & Dragon Head */}
          <g className={cn(!isReducedMotion && "animate-[dragon-head-tilt_8s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 175px" }}>
            <path
              d="M 400 60 L 430 115 L 490 70 L 455 140 L 480 170 L 440 195 L 420 255 L 400 275 L 380 255 L 360 195 L 320 170 L 345 140 L 310 70 L 370 115 Z"
              fill="url(#storm-lightning-grad)"
              stroke="#38bdf8"
              strokeWidth="1.4"
              strokeOpacity="0.6"
            />

            {/* Electric Lightning Arcs Across Crest */}
            <polyline
              points="330,80 350,110 335,130 365,150 350,175"
              fill="none"
              stroke="#7dd3fc"
              strokeWidth="1.8"
              strokeOpacity="0.8"
              filter="url(#storm-electric-glow)"
              className={cn(!isReducedMotion && "animate-pulse")}
            />
            <polyline
              points="470,80 450,110 465,130 435,150 450,175"
              fill="none"
              stroke="#7dd3fc"
              strokeWidth="1.8"
              strokeOpacity="0.8"
              filter="url(#storm-electric-glow)"
              className={cn(!isReducedMotion && "animate-pulse")}
            />

            {/* Piercing Electric Cyan Eyes */}
            <g className={cn(!isReducedMotion && "animate-[dragon-eye-glow_3s_ease-in-out_infinite]")}>
              <ellipse cx="372" cy="182" rx="8" ry="4" transform="rotate(-15 372 182)" fill="#38bdf8" filter="url(#storm-electric-glow)" />
              <ellipse cx="428" cy="182" rx="8" ry="4" transform="rotate(15 428 182)" fill="#38bdf8" filter="url(#storm-electric-glow)" />
              <line x1="372" y1="179" x2="372" y2="185" stroke="#082f49" strokeWidth="2" strokeLinecap="round" />
              <line x1="428" y1="179" x2="428" y2="185" stroke="#082f49" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>
        </svg>
      </div>

      <div
        className="absolute top-2 inset-x-0 h-60 opacity-45 filter blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}77 50%, transparent 85%)` }}
      />

      {/* Electrostatic Sparks */}
      {Array.from({ length: particleCount }).map((_, i) => {
        const left = (i * 23 + 5) % 96;
        const top = (i * 17 + 8) % 65;
        const size = (i % 2 === 0) ? 2.8 : 1.4;
        const dur = 2.8 + (i % 3);
        return (
          <span
            key={i}
            className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_var(--dur)_ease-in-out_infinite]")}
            style={
              {
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: colors.particles,
                boxShadow: `0 0 10px ${colors.glow}`,
                "--dur": `${dur}s`,
                animationDelay: `${(i % 4) * 0.4}s`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. CELESTIAL DRAGON
// ─────────────────────────────────────────────────────────────
export function CelestialDragonEffect({
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
          !isReducedMotion && "animate-[dragon-float-slow_10s_ease-in-out_infinite]"
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
            <linearGradient id="celestial-dragon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#4f46e5" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.15" />
            </linearGradient>
            <filter id="celestial-glow">
              <feGaussianBlur stdDeviation="5" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Serpentine Cosmic Arc */}
          <g className={cn(!isReducedMotion && "animate-[dragon-crest-sway_9s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 150px" }}>
            <path
              d="M 120 220 Q 260 70 400 120 Q 540 70 680 220"
              fill="none"
              stroke="#2dd4bf"
              strokeWidth="1.8"
              strokeDasharray="8 6"
              strokeOpacity="0.6"
            />
          </g>

          {/* Dragon Visage */}
          <g className={cn(!isReducedMotion && "animate-[dragon-head-tilt_8.5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 170px" }}>
            <path
              d="M 400 65 L 430 120 L 485 75 L 450 145 L 475 170 L 440 195 L 418 255 L 400 270 L 382 255 L 360 195 L 325 170 L 350 145 L 315 75 L 370 120 Z"
              fill="url(#celestial-dragon-grad)"
              stroke="#818cf8"
              strokeWidth="1.2"
              strokeOpacity="0.6"
            />

            {/* Constellation Nodes Over Head */}
            <circle cx="400" cy="65" r="4" fill="#a5f3fc" filter="url(#celestial-glow)" />
            <circle cx="315" cy="75" r="3.5" fill="#a5f3fc" filter="url(#celestial-glow)" />
            <circle cx="485" cy="75" r="3.5" fill="#a5f3fc" filter="url(#celestial-glow)" />

            {/* Piercing Celestial Starlight Eyes */}
            <g className={cn(!isReducedMotion && "animate-[dragon-eye-glow_3.5s_ease-in-out_infinite]")}>
              <ellipse cx="372" cy="182" rx="8" ry="4" transform="rotate(-15 372 182)" fill="#2dd4bf" filter="url(#celestial-glow)" />
              <ellipse cx="428" cy="182" rx="8" ry="4" transform="rotate(15 428 182)" fill="#2dd4bf" filter="url(#celestial-glow)" />
            </g>
          </g>
        </svg>
      </div>

      <div
        className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 50% at 50% 25%, ${colors.primary} 0%, ${colors.accent}44 50%, transparent 85%)` }}
      />

      {/* Starfield Particles */}
      {Array.from({ length: particleCount }).map((_, i) => {
        const left = (i * 21 + 8) % 95;
        const top = (i * 19 + 7) % 65;
        const size = (i % 3 === 0) ? 3.2 : 1.6;
        const dur = 3 + (i % 4);
        return (
          <span
            key={i}
            className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_var(--dur)_ease-in-out_infinite]")}
            style={
              {
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: colors.particles,
                boxShadow: `0 0 8px ${colors.glow}`,
                "--dur": `${dur}s`,
                animationDelay: `${(i % 5) * 0.5}s`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. ROYAL LION
// ─────────────────────────────────────────────────────────────
export function RoyalLionEffect({
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
        style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.35}px, ${pointerOffset.y * 0.25}px, 0)` : "none" }}
      >
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <defs>
            <linearGradient id="royal-lion-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#d97706" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#78350f" stopOpacity="0.15" />
            </linearGradient>
            <filter id="royal-gold-glow">
              <feGaussianBlur stdDeviation="5" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Diadem */}
          <g className={cn(!isReducedMotion && "animate-[dragon-crest-sway_8s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 50px" }}>
            <path d="M 350 90 L 370 50 L 390 85 L 400 40 L 410 85 L 430 50 L 450 90 Z" fill="none" stroke="#fbbf24" strokeWidth="2" filter="url(#royal-gold-glow)" />
            <circle cx="400" cy="36" r="4" fill="#fef08a" />
            <circle cx="370" cy="46" r="3" fill="#fef08a" />
            <circle cx="430" cy="46" r="3" fill="#fef08a" />
          </g>

          {/* Mane Breathing & Head */}
          <g className={cn(!isReducedMotion && "animate-[dragon-breathe_4.5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 200px" }}>
            <path d="M 280 200 Q 330 110 400 130 Q 470 110 520 200 Q 480 270 400 280 Q 320 270 280 200 Z" fill="url(#royal-lion-grad)" stroke="#f59e0b" strokeWidth="1.4" strokeOpacity="0.6" />
            <path d="M 380 180 L 420 180 L 410 220 L 390 220 Z" fill="#d97706" fillOpacity="0.35" stroke="#fbbf24" strokeWidth="1" />
            <g className={cn(!isReducedMotion && "animate-[dragon-eye-glow_3.5s_ease-in-out_infinite]")}>
              <ellipse cx="365" cy="170" rx="8" ry="4" transform="rotate(-10 365 170)" fill="#fbbf24" filter="url(#royal-gold-glow)" />
              <ellipse cx="435" cy="170" rx="8" ry="4" transform="rotate(10 435 170)" fill="#fbbf24" filter="url(#royal-gold-glow)" />
            </g>
          </g>
        </svg>
      </div>

      <div className="absolute top-2 inset-x-0 h-60 opacity-45 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}66 50%, transparent 85%)` }} />

      {Array.from({ length: particleCount }).map((_, i) => {
        const left = (i * 19 + 6) % 94;
        const top = (i * 23 + 8) % 65;
        const size = (i % 3 === 0) ? 3.2 : 1.8;
        const dur = 3 + (i % 3);
        return (
          <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_var(--dur)_ease-in-out_infinite]")} style={{ left: `${left}%`, top: `${top}%`, width: `${size}px`, height: `${size}px`, backgroundColor: colors.particles, boxShadow: `0 0 10px ${colors.glow}`, "--dur": `${dur}s` } as React.CSSProperties} />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 7. SHADOW PANTHER
// ─────────────────────────────────────────────────────────────
export function ShadowPantherEffect({
  effect,
  isReducedMotion,
  particleCount,
  pointerOffset,
}: CreatureEffectProps) {
  const { colors } = effect;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-75 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_10s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.3}px, ${pointerOffset.y * 0.25}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <defs>
            <filter id="panther-eye-glow"><feGaussianBlur stdDeviation="5" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          <g className={cn(!isReducedMotion && "animate-[dragon-head-tilt_8s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 170px" }}>
            <path d="M 330 110 L 350 70 L 375 115 L 425 115 L 450 70 L 470 110 Q 510 160 480 230 Q 400 270 320 230 Q 290 160 330 110 Z" fill="#09090b" stroke="#10b981" strokeWidth="1.2" strokeOpacity="0.45" />
            <line x1="320" y1="205" x2="250" y2="210" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.5" />
            <line x1="480" y1="205" x2="550" y2="210" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.5" />
            <g className={cn(!isReducedMotion && "animate-[dragon-eye-glow_3s_ease-in-out_infinite]")}>
              <ellipse cx="365" cy="165" rx="9" ry="5" transform="rotate(-8 365 165)" fill="#10b981" filter="url(#panther-eye-glow)" />
              <ellipse cx="435" cy="165" rx="9" ry="5" transform="rotate(8 435 165)" fill="#10b981" filter="url(#panther-eye-glow)" />
            </g>
          </g>
        </svg>
      </div>

      <div className="absolute top-2 inset-x-0 h-56 opacity-35 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 45% at 50% 25%, ${colors.primary} 0%, transparent 80%)` }} />

      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-70", !isReducedMotion && "animate-[dragon-ember-rise_3.5s_ease-in-out_infinite]")} style={{ left: `${(i * 21 + 10) % 94}%`, top: `${(i * 19 + 7) % 65}%`, width: `${(i % 3 === 0) ? 2.8 : 1.5}px`, height: `${(i % 3 === 0) ? 2.8 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 8. SPIRIT WOLF
// ─────────────────────────────────────────────────────────────
export function SpiritWolfEffect({
  effect,
  isReducedMotion,
  particleCount,
  pointerOffset,
}: CreatureEffectProps) {
  const { colors } = effect;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_9.5s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.35}px, ${pointerOffset.y * 0.25}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <defs><filter id="wolf-lunar-glow"><feGaussianBlur stdDeviation="5" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>

          <g className={cn(!isReducedMotion && "animate-[dragon-crest-sway_10s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 80px" }}>
            <path d="M 400 45 A 50 50 0 1 0 450 120 A 40 40 0 1 1 400 45 Z" fill="none" stroke="#22d3ee" strokeWidth="1.8" strokeOpacity="0.6" filter="url(#wolf-lunar-glow)" />
          </g>

          <g className={cn(!isReducedMotion && "animate-[dragon-head-tilt_8s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 170px" }}>
            <path d="M 330 110 L 350 60 L 375 110 L 425 110 L 450 60 L 470 110 Q 520 180 470 240 L 400 270 L 330 240 Q 280 180 330 110 Z" fill="none" stroke="#06b6d4" strokeWidth="1.4" strokeOpacity="0.55" />
            <g className={cn(!isReducedMotion && "animate-[dragon-eye-glow_3.2s_ease-in-out_infinite]")}>
              <ellipse cx="365" cy="165" rx="8" ry="4" transform="rotate(-12 365 165)" fill="#22d3ee" filter="url(#wolf-lunar-glow)" />
              <ellipse cx="435" cy="165" rx="8" ry="4" transform="rotate(12 435 165)" fill="#22d3ee" filter="url(#wolf-lunar-glow)" />
            </g>
          </g>
        </svg>
      </div>

      <div className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}77 50%, transparent 85%)` }} />

      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_4s_ease-in-out_infinite]")} style={{ left: `${(i * 20 + 8) % 94}%`, top: `${(i * 22 + 6) % 65}%`, width: `${(i % 3 === 0) ? 3.5 : 1.8}px`, height: `${(i % 3 === 0) ? 3.5 : 1.8}px`, backgroundColor: colors.particles, boxShadow: `0 0 10px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 9. ARCTIC WOLF
// ─────────────────────────────────────────────────────────────
export function ArcticWolfEffect({
  effect,
  isReducedMotion,
  particleCount,
  pointerOffset,
}: CreatureEffectProps) {
  const { colors } = effect;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_9s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.35}px, ${pointerOffset.y * 0.25}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <defs><filter id="arctic-frost-glow"><feGaussianBlur stdDeviation="5" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>

          <g className={cn(!isReducedMotion && "animate-[dragon-head-tilt_8.5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 165px" }}>
            <path d="M 330 110 L 350 55 L 375 110 L 425 110 L 450 55 L 470 110 Q 520 170 470 230 L 400 260 L 330 230 Q 280 170 330 110 Z" fill="none" stroke="#93c5fd" strokeWidth="1.4" strokeOpacity="0.55" />
            <polygon points="400,60 408,75 400,90 392,75" fill="#ffffff" fillOpacity="0.6" filter="url(#arctic-frost-glow)" />
            <g className={cn(!isReducedMotion && "animate-[dragon-eye-glow_3.5s_ease-in-out_infinite]")}>
              <ellipse cx="365" cy="165" rx="8" ry="4" transform="rotate(-10 365 165)" fill="#93c5fd" filter="url(#arctic-frost-glow)" />
              <ellipse cx="435" cy="165" rx="8" ry="4" transform="rotate(10 435 165)" fill="#93c5fd" filter="url(#arctic-frost-glow)" />
            </g>
          </g>
        </svg>
      </div>

      <div className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}66 50%, transparent 85%)` }} />

      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-85", !isReducedMotion && "animate-[dragon-ember-rise_3.8s_ease-in-out_infinite]")} style={{ left: `${(i * 22 + 7) % 95}%`, top: `${(i * 18 + 5) % 65}%`, width: `${(i % 3 === 0) ? 3.2 : 1.6}px`, height: `${(i % 3 === 0) ? 3.2 : 1.6}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 10. GOLDEN EAGLE
// ─────────────────────────────────────────────────────────────
export function GoldenEagleEffect({
  effect,
  isReducedMotion,
  particleCount,
  pointerOffset,
}: CreatureEffectProps) {
  const { colors } = effect;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_8.5s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.4}px, ${pointerOffset.y * 0.3}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <defs>
            <linearGradient id="eagle-gold-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fde047" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#eab308" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#713f12" stopOpacity="0.15" />
            </linearGradient>
            <filter id="eagle-sun-glow"><feGaussianBlur stdDeviation="5" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          <g className={cn(!isReducedMotion && "animate-[dragon-wing-left_5.5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 140px" }}>
            <path d="M 60 170 Q 220 40 400 110 Q 580 40 740 170 Q 560 110 400 140 Q 240 110 60 170 Z" fill="url(#eagle-gold-grad)" stroke="#fde047" strokeWidth="1.4" strokeOpacity="0.5" />
          </g>

          <g className={cn(!isReducedMotion && "animate-[dragon-head-tilt_7.5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 165px" }}>
            <polygon points="400,140 415,170 400,195 385,170" fill="#facc15" fillOpacity="0.5" stroke="#fde047" strokeWidth="1.2" />
            <g className={cn(!isReducedMotion && "animate-[dragon-eye-glow_3s_ease-in-out_infinite]")}>
              <ellipse cx="378" cy="155" rx="6" ry="3" transform="rotate(-15 378 155)" fill="#fde047" filter="url(#eagle-sun-glow)" />
              <ellipse cx="422" cy="155" rx="6" ry="3" transform="rotate(15 422 155)" fill="#fde047" filter="url(#eagle-sun-glow)" />
            </g>
          </g>
        </svg>
      </div>

      <div className="absolute top-2 inset-x-0 h-60 opacity-45 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}66 50%, transparent 85%)` }} />

      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3.2s_ease-in-out_infinite]")} style={{ left: `${(i * 20 + 8) % 94}%`, top: `${(i * 21 + 8) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.6}px`, height: `${(i % 3 === 0) ? 3 : 1.6}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 11. PHOENIX REBIRTH
// ─────────────────────────────────────────────────────────────
export function PhoenixRebirthEffect({
  effect,
  isReducedMotion,
  particleCount,
  pointerOffset,
}: CreatureEffectProps) {
  const { colors } = effect;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_8s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.4}px, ${pointerOffset.y * 0.3}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <defs>
            <linearGradient id="phoenix-flame-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#f97316" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#7c2d12" stopOpacity="0.2" />
            </linearGradient>
            <filter id="phoenix-rebirth-glow"><feGaussianBlur stdDeviation="6" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          <g className={cn(!isReducedMotion && "animate-[dragon-wing-left_5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 135px" }}>
            <path d="M 80 180 Q 240 30 400 100 Q 560 30 720 180 Q 550 100 400 135 Q 250 100 80 180 Z" fill="url(#phoenix-flame-grad)" stroke="#fbbf24" strokeWidth="1.8" strokeOpacity="0.6" />
          </g>

          <g className={cn(!isReducedMotion && "animate-[dragon-breathe_4s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 110px" }}>
            <circle cx="400" cy="110" r="32" fill="none" stroke="#fbbf24" strokeWidth="2" strokeOpacity="0.6" filter="url(#phoenix-rebirth-glow)" />
            <path d="M 400 55 L 415 95 L 400 125 L 385 95 Z" fill="#fde047" filter="url(#phoenix-rebirth-glow)" />
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
// 12. CELESTIAL PEGASUS
// ─────────────────────────────────────────────────────────────
export function CelestialPegasusEffect({
  effect,
  isReducedMotion,
  particleCount,
  pointerOffset,
}: CreatureEffectProps) {
  const { colors } = effect;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_9.5s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.4}px, ${pointerOffset.y * 0.3}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <defs>
            <linearGradient id="pegasus-star-grad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#e879f9" stopOpacity="0.85" /><stop offset="50%" stopColor="#a855f7" stopOpacity="0.5" /><stop offset="100%" stopColor="#3b0764" stopOpacity="0.15" /></linearGradient>
            <filter id="pegasus-astral-glow"><feGaussianBlur stdDeviation="5" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          <g className={cn(!isReducedMotion && "animate-[dragon-wing-left_6s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 145px" }}>
            <path d="M 90 180 Q 240 40 400 110 Q 560 40 710 180 Q 540 110 400 145 Q 260 110 90 180 Z" fill="url(#pegasus-star-grad)" stroke="#e879f9" strokeWidth="1.4" strokeOpacity="0.5" />
          </g>

          <g className={cn(!isReducedMotion && "animate-[dragon-head-tilt_8s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 110px" }}>
            <path d="M 370 70 Q 400 100 400 160 Q 400 100 430 70" fill="none" stroke="#f5d0fe" strokeWidth="1.8" strokeOpacity="0.7" filter="url(#pegasus-astral-glow)" />
            <circle cx="400" cy="70" r="4" fill="#ffffff" filter="url(#pegasus-astral-glow)" />
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
// 13. LEVIATHAN ABYSS
// ─────────────────────────────────────────────────────────────
export function LeviathanAbyssEffect({
  effect,
  isReducedMotion,
  particleCount,
  pointerOffset,
}: CreatureEffectProps) {
  const { colors } = effect;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_11s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.35}px, ${pointerOffset.y * 0.25}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <defs><filter id="leviathan-biolum-glow"><feGaussianBlur stdDeviation="5" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>

          <g className={cn(!isReducedMotion && "animate-[dragon-crest-sway_9s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 130px" }}>
            <path d="M 220 200 Q 310 110 400 130 Q 490 110 580 200" fill="none" stroke="#06b6d4" strokeWidth="2" strokeOpacity="0.6" filter="url(#leviathan-biolum-glow)" />
            <circle cx="400" cy="130" r="5" fill="#67e8f9" filter="url(#leviathan-biolum-glow)" />
          </g>
        </svg>
      </div>

      <div className="absolute top-2 inset-x-0 h-60 opacity-45 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}88 50%, transparent 85%)` }} />

      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-75", !isReducedMotion && "animate-[dragon-ember-rise_4.2s_ease-in-out_infinite]")} style={{ left: `${(i * 19 + 7) % 94}%`, top: `${(i * 22 + 9) % 65}%`, width: `${(i % 3 === 0) ? 3.5 : 1.8}px`, height: `${(i % 3 === 0) ? 3.5 : 1.8}px`, backgroundColor: colors.particles, boxShadow: `0 0 10px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 14. FROST GRIFFIN
// ─────────────────────────────────────────────────────────────
export function FrostGriffinEffect({
  effect,
  isReducedMotion,
  particleCount,
  pointerOffset,
}: CreatureEffectProps) {
  const { colors } = effect;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_9s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.4}px, ${pointerOffset.y * 0.3}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <defs><filter id="griffin-frost-glow"><feGaussianBlur stdDeviation="5" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>

          <g className={cn(!isReducedMotion && "animate-[dragon-wing-left_6s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 140px" }}>
            <path d="M 100 180 Q 250 40 400 110 Q 550 40 700 180 Q 540 100 400 140 Q 260 100 100 180 Z" fill="none" stroke="#7dd3fc" strokeWidth="1.8" strokeOpacity="0.5" />
          </g>

          <g className={cn(!isReducedMotion && "animate-[dragon-head-tilt_8s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 140px" }}>
            <polygon points="400,60 415,85 400,110 385,85" fill="#e0f2fe" fillOpacity="0.6" filter="url(#griffin-frost-glow)" />
            <polygon points="400,140 412,165 400,185 388,165" fill="#38bdf8" fillOpacity="0.5" stroke="#7dd3fc" strokeWidth="1.2" />
          </g>
        </svg>
      </div>

      <div className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}77 50%, transparent 85%)` }} />

      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-85", !isReducedMotion && "animate-[dragon-ember-rise_3.6s_ease-in-out_infinite]")} style={{ left: `${(i * 21 + 8) % 94}%`, top: `${(i * 19 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 8px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 15. SOLAR BASILISK
// ─────────────────────────────────────────────────────────────
export function SolarBasiliskEffect({
  effect,
  isReducedMotion,
  particleCount,
  pointerOffset,
}: CreatureEffectProps) {
  const { colors } = effect;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_10s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.35}px, ${pointerOffset.y * 0.25}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <defs><filter id="basilisk-solar-glow"><feGaussianBlur stdDeviation="5" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>

          <g className={cn(!isReducedMotion && "animate-[dragon-crest-sway_9s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 140px" }}>
            <ellipse cx="400" cy="140" rx="280" ry="80" fill="none" stroke="#eab308" strokeWidth="1.8" strokeOpacity="0.5" strokeDasharray="14 8" />
            <circle cx="400" cy="140" r="44" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeOpacity="0.7" filter="url(#basilisk-solar-glow)" />
          </g>
        </svg>
      </div>

      <div className="absolute top-2 inset-x-0 h-60 opacity-45 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}77 50%, transparent 85%)` }} />

      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3.4s_ease-in-out_infinite]")} style={{ left: `${(i * 20 + 7) % 94}%`, top: `${(i * 22 + 8) % 65}%`, width: `${(i % 3 === 0) ? 3.2 : 1.8}px`, height: `${(i % 3 === 0) ? 3.2 : 1.8}px`, backgroundColor: colors.particles, boxShadow: `0 0 10px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 16. SINGULARITY HORIZON
// ─────────────────────────────────────────────────────────────
export function SingularityHorizonEffect({
  effect,
  isReducedMotion,
  particleCount,
  pointerOffset,
}: CreatureEffectProps) {
  const { colors } = effect;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-85 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_12s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.4}px, ${pointerOffset.y * 0.3}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <defs>
            <linearGradient id="accretion-grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#ec4899" stopOpacity="0.85" /><stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.95" /><stop offset="100%" stopColor="#ec4899" stopOpacity="0.85" /></linearGradient>
            <filter id="singularity-warp-glow"><feGaussianBlur stdDeviation="6" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          <g className={cn(!isReducedMotion && "animate-[dragon-breathe_6s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 150px" }}>
            <ellipse cx="400" cy="150" rx="320" ry="75" fill="none" stroke="url(#accretion-grad)" strokeWidth="3.5" filter="url(#singularity-warp-glow)" />
            <circle cx="400" cy="150" r="46" fill="#000000" stroke="#8b5cf6" strokeWidth="2" strokeOpacity="0.9" />
          </g>
        </svg>
      </div>

      <div className="absolute top-2 inset-x-0 h-64 opacity-50 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, rgba(9, 9, 11, 0.9) 70%, transparent 95%)` }} />

      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-85", !isReducedMotion && "animate-[dragon-ember-rise_4s_ease-in-out_infinite]")} style={{ left: `${(i * 21 + 8) % 94}%`, top: `${(i * 19 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3.2 : 1.5}px`, height: `${(i % 3 === 0) ? 3.2 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 10px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 17. CYBERNETIC NEON DRAGON
// ─────────────────────────────────────────────────────────────
export function CyberDragonEffect({
  effect,
  isReducedMotion,
  particleCount,
  pointerOffset,
}: CreatureEffectProps) {
  const { colors } = effect;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-85 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_8s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.4}px, ${pointerOffset.y * 0.3}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <defs><filter id="mecha-neon-glow"><feGaussianBlur stdDeviation="4" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>

          <g className={cn(!isReducedMotion && "animate-[dragon-head-tilt_7.5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 170px" }}>
            <polyline points="320,80 360,120 380,165" fill="none" stroke="#10b981" strokeWidth="2" strokeOpacity="0.8" filter="url(#mecha-neon-glow)" />
            <polyline points="480,80 440,120 420,165" fill="none" stroke="#10b981" strokeWidth="2" strokeOpacity="0.8" filter="url(#mecha-neon-glow)" />
            <rect x="350" y="170" width="100" height="14" rx="4" fill="#022c22" stroke="#34d399" strokeWidth="1.8" filter="url(#mecha-neon-glow)" />
            <line x1="360" y1="177" x2="440" y2="177" stroke="#10b981" strokeWidth="2.5" />
          </g>
        </svg>
      </div>

      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(${colors.accent}22 1px, transparent 1px), linear-gradient(90deg, ${colors.accent}22 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />

      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className="absolute rounded-none pointer-events-none opacity-80 animate-pulse font-mono text-[9px] text-emerald-400 select-none" style={{ left: `${(i * 22 + 6) % 95}%`, top: `${(i * 18 + 8) % 65}%` }}>{i % 2 === 0 ? "01" : "10"}</span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 18. VOID SOVEREIGN
// ─────────────────────────────────────────────────────────────
export function VoidSovereignEffect({
  effect,
  isReducedMotion,
  particleCount,
  pointerOffset,
}: CreatureEffectProps) {
  const { colors } = effect;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_10s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.35}px, ${pointerOffset.y * 0.25}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <defs><filter id="void-monarch-glow"><feGaussianBlur stdDeviation="6" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>

          <g className={cn(!isReducedMotion && "animate-[dragon-breathe_5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 140px" }}>
            <circle cx="400" cy="140" r="48" fill="#09090b" stroke="#a855f7" strokeWidth="2.5" strokeOpacity="0.8" filter="url(#void-monarch-glow)" />
            <path d="M 330 110 L 350 65 L 380 95 L 400 50 L 420 95 L 450 65 L 470 110 Z" fill="none" stroke="#c084fc" strokeWidth="2" strokeOpacity="0.9" filter="url(#void-monarch-glow)" />
          </g>
        </svg>
      </div>

      <div className="absolute top-2 inset-x-0 h-64 opacity-45 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.secondary}77 50%, transparent 85%)` }} />

      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-80", !isReducedMotion && "animate-[dragon-ember-rise_3.8s_ease-in-out_infinite]")} style={{ left: `${(i * 21 + 8) % 94}%`, top: `${(i * 22 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3.2 : 1.5}px`, height: `${(i % 3 === 0) ? 3.2 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 10px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 19. QUANTUM PHANTOM
// ─────────────────────────────────────────────────────────────
export function QuantumPhantomEffect({
  effect,
  isReducedMotion,
  particleCount,
  pointerOffset,
}: CreatureEffectProps) {
  const { colors } = effect;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-80 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_9s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.4}px, ${pointerOffset.y * 0.3}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <defs><filter id="quantum-spectral-glow"><feGaussianBlur stdDeviation="5" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>

          <g className={cn(!isReducedMotion && "animate-[dragon-crest-sway_8s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 140px" }}>
            <ellipse cx="400" cy="140" rx="300" ry="70" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="12 8" />
            <path d="M 370 100 Q 400 80 430 100 Q 450 140 430 180 Q 400 200 370 180 Q 350 140 370 100 Z" fill="none" stroke="#e9d5ff" strokeWidth="1.5" strokeOpacity="0.6" filter="url(#quantum-spectral-glow)" />
          </g>
        </svg>
      </div>

      <div className="absolute top-2 inset-x-0 h-60 opacity-40 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 65% 50% at 50% 25%, ${colors.primary} 0%, ${colors.accent}44 50%, transparent 85%)` }} />

      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-75", !isReducedMotion && "animate-[dragon-ember-rise_3.5s_ease-in-out_infinite]")} style={{ left: `${(i * 20 + 8) % 94}%`, top: `${(i * 21 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3 : 1.5}px`, height: `${(i % 3 === 0) ? 3 : 1.5}px`, backgroundColor: colors.particles, boxShadow: `0 0 10px ${colors.glow}` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 20. SUPERNOVA ASTRAL CORE
// ─────────────────────────────────────────────────────────────
export function SupernovaCoreEffect({
  effect,
  isReducedMotion,
  particleCount,
  pointerOffset,
}: CreatureEffectProps) {
  const { colors } = effect;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn("absolute inset-x-0 top-0 flex justify-center items-start opacity-85 transition-transform duration-700 ease-out", !isReducedMotion && "animate-[dragon-float-slow_8s_ease-in-out_infinite]")} style={{ transform: !isReducedMotion ? `translate3d(${pointerOffset.x * 0.4}px, ${pointerOffset.y * 0.3}px, 0)` : "none" }}>
        <svg viewBox="0 0 800 360" className="w-full max-w-4xl h-56 sm:h-72 object-contain overflow-visible" preserveAspectRatio="xMidYMin meet">
          <defs><filter id="supernova-burst-glow"><feGaussianBlur stdDeviation="6" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>

          <g className={cn(!isReducedMotion && "animate-[dragon-breathe_4.5s_ease-in-out_infinite]")} style={{ transformOrigin: "400px 140px" }}>
            <circle cx="400" cy="140" r="70" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeOpacity="0.8" filter="url(#supernova-burst-glow)" />
            <circle cx="400" cy="140" r="26" fill="#ffffff" filter="url(#supernova-burst-glow)" />
            <line x1="400" y1="40" x2="400" y2="240" stroke="#fef08a" strokeWidth="1.8" strokeOpacity="0.7" />
            <line x1="300" y1="140" x2="500" y2="140" stroke="#fef08a" strokeWidth="1.8" strokeOpacity="0.7" />
          </g>
        </svg>
      </div>

      <div className="absolute top-2 inset-x-0 h-64 opacity-50 filter blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 50% at 50% 25%, ${colors.primary} 0%, ${colors.accent}66 45%, transparent 85%)` }} />

      {Array.from({ length: particleCount }).map((_, i) => (
        <span key={i} className={cn("absolute rounded-full pointer-events-none opacity-85", !isReducedMotion && "animate-[dragon-ember-rise_2.8s_ease-in-out_infinite]")} style={{ left: `${(i * 20 + 8) % 94}%`, top: `${(i * 21 + 7) % 65}%`, width: `${(i % 3 === 0) ? 3.5 : 1.8}px`, height: `${(i % 3 === 0) ? 3.5 : 1.8}px`, backgroundColor: colors.particles, boxShadow: `0 0 10px ${colors.glow}` }} />
      ))}
    </div>
  );
}
