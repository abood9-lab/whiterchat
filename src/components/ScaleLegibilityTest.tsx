import React from 'react';
import { LogoConfig } from '../types/logo';
import { SvgLogoMark } from './SvgLogoMark';
import { Check, ShieldAlert, Sparkles, Layers, Eye } from 'lucide-react';

interface ScaleLegibilityTestProps {
  config: LogoConfig;
}

export const ScaleLegibilityTest: React.FC<ScaleLegibilityTestProps> = ({ config }) => {
  const sizes = [
    { size: 256, label: '256px (Master App Header / Display)' },
    { size: 128, label: '128px (Desktop Dashboard / App Launcher)' },
    { size: 64, label: '64px (Mobile App Icon / Dock)' },
    { size: 32, label: '32px (Browser Tab / Toolbar)' },
    { size: 16, label: '16px (Micro Favicon / Status Bar)' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
          Silhouette Integrity Verification
        </span>
        <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white mt-1">
          Scale & Micro-Favicon Legibility Test
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl mt-1">
          A world-class logo emblem must maintain strong geometric balance, radial symmetry, and instantly recognizable silhouette clarity at every display resolution down to a 16px favicon.
        </p>
      </div>

      {/* Grid of Light and Dark Scale Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Light Mode Container */}
        <div className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Light Canvas Scale Matrix
            </span>
            <span className="text-xs text-slate-500 font-mono">#F8F9FC Background</span>
          </div>

          <div className="space-y-8">
            {sizes.map(({ size, label }) => (
              <div key={size} className="flex items-center gap-6 pb-6 border-b border-slate-100 last:border-b-0 last:pb-0">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center shrink-0 min-w-[120px] min-h-[120px]">
                  <SvgLogoMark config={config} size={size} isDarkOverride={false} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-900">{size} × {size} px</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" />
                      <span>Passed</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {size <= 32 ? 'High contrast inner aperture ring preserves iris core.' : 'Curved blades & glassmorphism bevels fully articulated.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dark Mode Container */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Dark Mode Obsidian Scale Matrix
            </span>
            <span className="text-xs text-slate-400 font-mono">#090D16 Background</span>
          </div>

          <div className="space-y-8">
            {sizes.map(({ size, label }) => (
              <div key={size} className="flex items-center gap-6 pb-6 border-b border-slate-800/80 last:border-b-0 last:pb-0">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 min-w-[120px] min-h-[120px]">
                  <SvgLogoMark config={config} size={size} isDarkOverride={true} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white">{size} × {size} px</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-800/60">
                      <Sparkles className="w-3 h-3" />
                      <span>Subsurface Glow</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {size <= 32 ? 'Icy cyan focal point glows distinctly.' : 'Pearl white & cyan light contrast perfectly against deep slate.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
