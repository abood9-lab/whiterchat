import React, { useState } from 'react';
import { LogoConfig } from '../types/logo';
import { SvgLogoMark } from './SvgLogoMark';
import { Copy, Check, Shield, Layers, Layout, Monitor, Smartphone, Cpu, ExternalLink } from 'lucide-react';

interface BrandIdentityViewProps {
  config: LogoConfig;
}

export const BrandIdentityView: React.FC<BrandIdentityViewProps> = ({ config }) => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const colors = [
    { name: 'Pearl White', hex: '#F8F9FC', usage: 'Dominant 60% Canvas & Glass Base', rgb: 'rgb(248, 249, 252)' },
    { name: 'Soft Ivory', hex: '#F3F4F6', usage: 'Structural Surfaces & Card Backings', rgb: 'rgb(243, 244, 246)' },
    { name: 'Icy Cyan', hex: '#06B6D4', usage: '10% Accent Core Light & Active Points', rgb: 'rgb(6, 182, 212)' },
    { name: 'Pale Aqua', hex: '#CFFAFE', usage: 'Subsurface Diffusion & Refraction Highlights', rgb: 'rgb(207, 250, 254)' },
    { name: 'Metallic Silver', hex: '#CBD5E1', usage: 'Polished Bevels & Frame Accents', rgb: 'rgb(203, 213, 225)' },
    { name: 'Deep Obsidian', hex: '#090D16', usage: 'Dark Theme Canvas & Premium Contrast', rgb: 'rgb(9, 13, 22)' },
  ];

  const copyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  return (
    <div className="space-y-12">
      {/* Brand Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
          Brand Architecture & Guidelines
        </span>
        <h2 className="font-display font-bold text-3xl text-slate-900 dark:text-white mt-1">
          Aether Lens Brand System
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl mt-1">
          Luxury technology brand identity designed with Apple-level visual refinement, precise 3D glassmorphism, and minimal geometric structure.
        </p>
      </div>

      {/* 1. Color System & Tokens */}
      <section className="space-y-4">
        <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white">
          01. Color Palette & Design System Tokens
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Strict 60-30-10 color distribution enforcing 60% neutral field, 30% structural surfaces, and 10% concentrated icy cyan accent.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {colors.map((c) => (
            <div
              key={c.hex}
              onClick={() => copyColor(c.hex)}
              className="group cursor-pointer p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-cyan-500 transition-all"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl border border-black/10 shadow-inner shrink-0 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: c.hex }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {c.name}
                    </span>
                    {copiedHex === c.hex ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                    )}
                  </div>
                  <span className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400 block mt-0.5">
                    {c.hex}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate mt-1">
                    {c.usage}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Clear Space & Exclusion Zone */}
      <section className="space-y-4">
        <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white">
          02. Clear Space & Minimum Safe Margin
        </h3>
        <div className="p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row items-center justify-around gap-8">
          {/* Visual Exclusion Box */}
          <div className="relative p-12 border-2 border-dashed border-cyan-400/60 rounded-2xl bg-white dark:bg-slate-950 shadow-inner flex items-center justify-center">
            <span className="absolute top-2 left-3 text-[10px] font-mono text-cyan-600 dark:text-cyan-400">Exclusion Safe Zone (1X = Aperture Radius)</span>
            <SvgLogoMark config={config} size={140} />
          </div>

          <div className="max-w-md space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white">Exclusion Zone Rules</h4>
            <p>
              Always maintain a minimum clear space equal to <strong>1X</strong> (the radius of the central camera aperture) around all four sides of the emblem.
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400">
              <li>Do not place text, headlines, or secondary logos within the clear space.</li>
              <li>Preserve pure off-white or obsidian background negative space.</li>
              <li>Do not distort, stretch, or alter the radial symmetry of the interlocking blades.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 3. In-Context Brand Application Mockups */}
      <section className="space-y-6">
        <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white">
          03. In-Context Digital Product Mockups
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SaaS Navigation Bar Mockup */}
          <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Monitor className="w-4 h-4 text-cyan-500" />
              <span>SaaS App Header Integration</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 text-white border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <SvgLogoMark config={config} size={32} isDarkOverride={true} />
                <span className="font-display font-bold text-sm tracking-tight">AETHER LENS</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                <span>Products</span>
                <span>API</span>
                <span>Docs</span>
              </div>
              <button className="px-3 py-1 text-xs font-semibold rounded-lg bg-cyan-500 text-slate-950">Launch</button>
            </div>
            <p className="text-xs text-slate-500">
              Clean single-line header integration with 32px emblem and high contrast typography.
            </p>
          </div>

          {/* iOS Mobile App Icon */}
          <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Smartphone className="w-4 h-4 text-cyan-500" />
              <span>iOS & Mobile App Icon</span>
            </div>

            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-[22%] bg-gradient-to-b from-slate-900 via-slate-950 to-black p-3 flex items-center justify-center shadow-lg border border-slate-800">
                <SvgLogoMark config={config} size={64} isDarkOverride={true} />
              </div>
              <div>
                <p className="font-display font-semibold text-sm text-slate-900 dark:text-white">Aether Camera AI</p>
                <p className="text-xs text-slate-500">Squircle App Icon (1024×1024 master)</p>
                <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono block mt-1">iOS App Store Ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
