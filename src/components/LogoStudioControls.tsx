import React from 'react';
import { Sliders, RefreshCw, Eye, Sparkles, Box, Sun, Shield, RotateCw } from 'lucide-react';
import { LogoConfig, MaterialPreset, FrameStyle, BackgroundMode } from '../types/logo';

interface LogoStudioControlsProps {
  config: LogoConfig;
  setConfig: React.Dispatch<React.SetStateAction<LogoConfig>>;
  onReset: () => void;
}

export const LogoStudioControls: React.FC<LogoStudioControlsProps> = ({
  config,
  setConfig,
  onReset,
}) => {
  const isDark = config.bgMode === 'deep_dark';

  const updateConfig = <K extends keyof LogoConfig>(key: K, value: LogoConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const presets: { id: MaterialPreset; name: string; colorDot: string }[] = [
    { id: 'pearl_cyan', name: 'Pearl & Icy Cyan', colorDot: 'bg-gradient-to-r from-slate-100 to-cyan-400' },
    { id: 'dark_obsidian', name: 'Dark Obsidian', colorDot: 'bg-gradient-to-r from-slate-900 to-cyan-500' },
    { id: 'frosted_crystal', name: 'Frosted Crystal', colorDot: 'bg-gradient-to-r from-sky-200 to-cyan-300' },
    { id: 'polished_silver', name: 'Polished Silver', colorDot: 'bg-gradient-to-r from-slate-300 to-slate-400' },
  ];

  const frames: { id: FrameStyle; name: string }[] = [
    { id: 'rounded_octagonal', name: 'Rounded Octagonal' },
    { id: 'segmented_arc', name: 'Segmented Arcs' },
    { id: 'minimal_ring', name: 'Minimal Ring' },
    { id: 'none', name: 'No Frame' },
  ];

  const bgModes: { id: BackgroundMode; name: string }[] = [
    { id: 'cool_white', name: 'Cool Off-White' },
    { id: 'deep_dark', name: 'Deep Slate Dark' },
    { id: 'soft_ivory', name: 'Soft Ivory' },
  ];

  return (
    <div className={`p-6 rounded-2xl border transition-colors ${
      isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white/90 border-slate-200/80 text-slate-800'
    } shadow-xs space-y-6`}>
      {/* Control Panel Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-500" />
          <h2 className="font-display font-semibold text-sm tracking-tight">3D Geometry & Material Parameters</h2>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Reset to default logo parameters"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* 1. Material Presets */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Material & Finish Presets
        </label>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => updateConfig('preset', p.id)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl border transition-all text-left ${
                config.preset === p.id
                  ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 font-semibold shadow-2xs'
                  : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${p.colorDot} border border-black/10 shrink-0`} />
              <span className="truncate">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Aperture Geometry Sliders */}
      <div className="space-y-4 pt-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
          Camera Lens & Blade Geometry
        </span>

        {/* Blade Count */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300">Shutter Blades Count</span>
            <span className="font-mono font-medium text-cyan-600 dark:text-cyan-400">{config.bladeCount} blades</span>
          </div>
          <input
            type="range"
            min={6}
            max={12}
            step={1}
            value={config.bladeCount}
            onChange={(e) => updateConfig('bladeCount', parseInt(e.target.value))}
            className="w-full accent-cyan-500 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Aperture Opening Size */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300">Aperture Focal Center Opening</span>
            <span className="font-mono font-medium text-cyan-600 dark:text-cyan-400">{(config.apertureSize * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0.15}
            max={0.75}
            step={0.05}
            value={config.apertureSize}
            onChange={(e) => updateConfig('apertureSize', parseFloat(e.target.value))}
            className="w-full accent-cyan-500 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Blade Twist & Curvature */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300">Blade Arc & Twist Curve</span>
            <span className="font-mono font-medium text-cyan-600 dark:text-cyan-400">{config.bladeCurvature.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min={0.3}
            max={1.4}
            step={0.05}
            value={config.bladeCurvature}
            onChange={(e) => updateConfig('bladeCurvature', parseFloat(e.target.value))}
            className="w-full accent-cyan-500 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* 3. Materials & Subsurface Diffusion */}
      <div className="space-y-4 pt-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
          Glassmorphism & Lighting
        </span>

        {/* Glass Opacity */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300">Glass Translucency</span>
            <span className="font-mono font-medium text-cyan-600 dark:text-cyan-400">{(config.glassOpacity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0.2}
            max={0.95}
            step={0.05}
            value={config.glassOpacity}
            onChange={(e) => updateConfig('glassOpacity', parseFloat(e.target.value))}
            className="w-full accent-cyan-500 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Icy Cyan Core Glow */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300">Icy Cyan Core Light Diffusion</span>
            <span className="font-mono font-medium text-cyan-600 dark:text-cyan-400">{(config.cyanGlowIntensity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1.8}
            step={0.1}
            value={config.cyanGlowIntensity}
            onChange={(e) => updateConfig('cyanGlowIntensity', parseFloat(e.target.value))}
            className="w-full accent-cyan-500 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* 4. Geometric Frame Style */}
      <div className="space-y-2 pt-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Geometric Outer Frame
        </label>
        <div className="grid grid-cols-2 gap-2">
          {frames.map((f) => (
            <button
              key={f.id}
              onClick={() => updateConfig('frameStyle', f.id)}
              className={`px-3 py-2 text-xs font-medium rounded-xl border text-center transition-all ${
                config.frameStyle === f.id
                  ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 font-semibold'
                  : 'border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Background Environment */}
      <div className="space-y-2 pt-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Background Environment
        </label>
        <div className="grid grid-cols-3 gap-2">
          {bgModes.map((bg) => (
            <button
              key={bg.id}
              onClick={() => updateConfig('bgMode', bg.id)}
              className={`px-2.5 py-2 text-xs font-medium rounded-xl border text-center transition-all ${
                config.bgMode === bg.id
                  ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 font-semibold'
                  : 'border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              {bg.name}
            </button>
          ))}
        </div>
      </div>

      {/* 6. Toggles */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={config.autoRotate}
            onChange={(e) => updateConfig('autoRotate', e.target.checked)}
            className="rounded border-slate-300 text-cyan-500 focus:ring-cyan-500 w-4 h-4"
          />
          <RotateCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Auto Orbit Motion</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={config.showNetworkGrid}
            onChange={(e) => updateConfig('showNetworkGrid', e.target.checked)}
            className="rounded border-slate-300 text-cyan-500 focus:ring-cyan-500 w-4 h-4"
          />
          <span>Distant Grid Lines</span>
        </label>
      </div>
    </div>
  );
};
