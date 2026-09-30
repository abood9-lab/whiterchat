import React, { useState } from 'react';
import { LogoConfig } from '../types/logo';
import { SvgLogoMark } from './SvgLogoMark';
import { X, Copy, Check, Download, FileCode, Sparkles, Image } from 'lucide-react';

interface PromptExporterModalProps {
  config: LogoConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const PromptExporterModal: React.FC<PromptExporterModalProps> = ({
  config,
  isOpen,
  onClose,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  // Generate clean SVG string for code export
  const generateSvgCode = () => {
    return `<svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- AETHER LENS - Camera Shutter 3D Glass Emblem Vector Mark -->
  <defs>
    <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#06B6D4" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#06B6D4" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- Central Aperture Focal Core -->
  <circle cx="200" cy="200" r="48" fill="url(#coreGlow)"/>
  <circle cx="200" cy="200" r="35" fill="none" stroke="#CBD5E1" stroke-width="3"/>
  <circle cx="200" cy="200" r="8" fill="#0891B2"/>
</svg>`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateSvgCode());
    setCopiedType('svg');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyPrompt = () => {
    const promptText = `A premium futuristic 3D logo emblem with a minimalist, elegant, high-end technology aesthetic. Centered circular camera-shutter and camera-lens inspired symbol composed of ${config.bladeCount} smooth interlocking curved blades rotating around a central focal point. Crafted from pearl white, soft ivory, translucent frosted glass, icy cyan glow, and polished silver accents. Features subtle glassmorphism layers, smooth bevels, realistic depth, and controlled subsurface light diffusion. Outer geometric frame style: ${config.frameStyle}. Soft studio lighting, realistic contact shadow, delicate cyan highlights, on a clean cool-white minimalist background with barely visible fine geometric grid lines. Ultra clean geometry, 4K quality, no text or typography.`;
    
    navigator.clipboard.writeText(promptText);
    setCopiedType('prompt');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([generateSvgCode()], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aether_lens_camera_shutter_emblem.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setCopiedType('download');
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Export Brand Assets</h3>
              <p className="text-xs text-slate-500">Vector SVG, PNG, and AI Prompt Recipes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Vector Preview */}
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
          <SvgLogoMark config={config} size={160} />
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Download SVG */}
          <button
            onClick={handleDownloadSvg}
            className="flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md"
          >
            {copiedType === 'download' ? <Check className="w-4 h-4" /> : <FileCode className="w-4 h-4" />}
            <span>Download Vector SVG (.svg)</span>
          </button>

          {/* Copy Clean SVG Code */}
          <button
            onClick={handleCopyCode}
            className="flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-md"
          >
            {copiedType === 'svg' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>Copy Vector SVG Code</span>
          </button>
        </div>

        {/* 4K AI Prompt Recipe Box */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>4K AI Generation Prompt Recipe</span>
            </span>
            <button
              onClick={handleCopyPrompt}
              className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-cyan-500 flex items-center gap-1"
            >
              {copiedType === 'prompt' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy Prompt</span>
            </button>
          </div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
            A premium futuristic 3D logo emblem with a minimalist, elegant, high-end technology aesthetic. Centered circular camera-shutter and camera-lens inspired symbol composed of {config.bladeCount} smooth interlocking curved blades...
          </p>
        </div>
      </div>
    </div>
  );
};
