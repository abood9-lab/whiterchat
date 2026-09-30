import React from 'react';
import { LogoConfig } from '../types/logo';

interface SvgLogoMarkProps {
  config: LogoConfig;
  size?: number;
  className?: string;
  isDarkOverride?: boolean;
}

export const SvgLogoMark: React.FC<SvgLogoMarkProps> = ({
  config,
  size = 120,
  className = '',
  isDarkOverride,
}) => {
  const isDark = isDarkOverride ?? (config.bgMode === 'deep_dark');
  const {
    bladeCount = 8,
    apertureSize = 0.35,
    bladeCurvature = 0.8,
    frameStyle = 'rounded_octagonal',
    cyanGlowIntensity = 0.8,
  } = config;

  const viewBoxSize = 400;
  const center = viewBoxSize / 2;
  const outerRadius = 140;
  const innerRadius = 35 + apertureSize * 45;

  // Generate N interlocking curved blades
  const blades = Array.from({ length: bladeCount }).map((_, i) => {
    const angleStart = (i * 360) / bladeCount;
    const angleEnd = angleStart + (360 / bladeCount) * (1.2 + bladeCurvature * 0.4);

    const radStart = (angleStart * Math.PI) / 180;
    const radEnd = (angleEnd * Math.PI) / 180;

    // Inner arc point
    const x1 = center + innerRadius * Math.cos(radStart);
    const y1 = center + innerRadius * Math.sin(radStart);

    // Outer arc point
    const x2 = center + outerRadius * Math.cos(radEnd);
    const y2 = center + outerRadius * Math.sin(radEnd);

    // Control point for smooth curved blade twist
    const cpAngle = radStart + ((radEnd - radStart) * 0.6) + (bladeCurvature * 0.3);
    const cpRadius = outerRadius * 0.95;
    const cpx1 = center + cpRadius * Math.cos(cpAngle);
    const cpy1 = center + cpRadius * Math.sin(cpAngle);

    // Return outer path arc back to inner radius
    const innerReturnAngle = radStart + ((angleEnd - angleStart) * 0.25 * Math.PI / 180);
    const x3 = center + (outerRadius * 0.88) * Math.cos(radEnd + 0.15);
    const y3 = center + (outerRadius * 0.88) * Math.sin(radEnd + 0.15);

    const pathData = `
      M ${x1} ${y1}
      Q ${cpx1} ${cpy1} ${x2} ${y2}
      A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3}
      Q ${center + (innerRadius * 1.3) * Math.cos(cpAngle - 0.2)} ${center + (innerRadius * 1.3) * Math.sin(cpAngle - 0.2)} ${x1} ${y1}
      Z
    `;

    return {
      index: i,
      pathData,
      opacity: 0.75 + (i % 2) * 0.2,
    };
  });

  // Generate outer frame
  const frameRadius = 175;
  const renderFrame = () => {
    if (frameStyle === 'none') return null;

    if (frameStyle === 'rounded_octagonal') {
      const sides = 8;
      const points = Array.from({ length: sides }).map((_, i) => {
        const a = (i * 360 / sides - 22.5) * Math.PI / 180;
        const x = center + frameRadius * Math.cos(a);
        const y = center + frameRadius * Math.sin(a);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');

      return (
        <g className="transition-all duration-300">
          <polygon
            points={points}
            fill="none"
            stroke={isDark ? "rgba(226,232,240,0.3)" : "rgba(148,163,184,0.35)"}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Subtle outer corner accents */}
          {Array.from({ length: sides }).map((_, i) => {
            const a = (i * 360 / sides - 22.5) * Math.PI / 180;
            const x = center + (frameRadius + 8) * Math.cos(a);
            const y = center + (frameRadius + 8) * Math.sin(a);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="2.5"
                fill={isDark ? "#38BDF8" : "#0891B2"}
                opacity="0.8"
              />
            );
          })}
        </g>
      );
    }

    if (frameStyle === 'segmented_arc') {
      const segments = 4;
      return (
        <g>
          {Array.from({ length: segments }).map((_, i) => {
            const startA = i * 90 + 10;
            const endA = startA + 70;
            const sRad = (startA * Math.PI) / 180;
            const eRad = (endA * Math.PI) / 180;
            const x1 = center + frameRadius * Math.cos(sRad);
            const y1 = center + frameRadius * Math.sin(sRad);
            const x2 = center + frameRadius * Math.cos(eRad);
            const y2 = center + frameRadius * Math.sin(eRad);
            const arcPath = `M ${x1} ${y1} A ${frameRadius} ${frameRadius} 0 0 1 ${x2} ${y2}`;

            return (
              <path
                key={i}
                d={arcPath}
                fill="none"
                stroke={isDark ? "rgba(56, 189, 248, 0.6)" : "rgba(8, 145, 178, 0.5)"}
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            );
          })}
        </g>
      );
    }

    // Default minimal_ring
    return (
      <circle
        cx={center}
        cy={center}
        r={frameRadius}
        fill="none"
        stroke={isDark ? "rgba(226, 232, 240, 0.25)" : "rgba(100, 116, 139, 0.3)"}
        strokeWidth="2"
        strokeDasharray="12 6"
      />
    );
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
    >
      <defs>
        {/* Central Core Glow */}
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.9 * cyanGlowIntensity} />
          <stop offset="45%" stopColor="#67E8F9" stopOpacity={0.5 * cyanGlowIntensity} />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
        </radialGradient>

        {/* Blade Glass Gradient Light */}
        <linearGradient id="bladeGlassLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#E0F2FE" stopOpacity="0.75" />
          <stop offset="80%" stopColor="#CFFAFE" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.3" />
        </linearGradient>

        {/* Blade Glass Gradient Dark */}
        <linearGradient id="bladeGlassDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#38BDF8" stopOpacity="0.6" />
          <stop offset="85%" stopColor="#0284C7" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.8" />
        </linearGradient>

        {/* Silver Metallic Bevel */}
        <linearGradient id="metallicBevel" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#CBD5E1" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.6" />
        </linearGradient>

        {/* Soft Drop Shadow Filter */}
        <filter id="softGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer Frame */}
      {renderFrame()}

      {/* Central Cyan Core Focal Aperture */}
      <circle
        cx={center}
        cy={center}
        r={innerRadius + 12}
        fill="url(#coreGlow)"
        filter="url(#softGlowFilter)"
      />

      {/* Inner Metallic Aperture Ring */}
      <circle
        cx={center}
        cy={center}
        r={innerRadius}
        fill="none"
        stroke="url(#metallicBevel)"
        strokeWidth="3"
        opacity="0.85"
      />

      {/* Interlocking Curved Camera Blades Group */}
      <g filter="url(#softGlowFilter)">
        {blades.map((b) => (
          <path
            key={b.index}
            d={b.pathData}
            fill={isDark ? "url(#bladeGlassDark)" : "url(#bladeGlassLight)"}
            stroke={isDark ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.8)"}
            strokeWidth="1.5"
            style={{ opacity: b.opacity }}
          />
        ))}
      </g>

      {/* Central Focal Point / Camera Iris Center Dot */}
      <circle
        cx={center}
        cy={center}
        r={Math.max(4, innerRadius * 0.35)}
        fill={isDark ? "#E0F2FE" : "#0891B2"}
        opacity="0.9"
      />
      <circle
        cx={center}
        cy={center}
        r={Math.max(2, innerRadius * 0.18)}
        fill="#FFFFFF"
      />
    </svg>
  );
};
