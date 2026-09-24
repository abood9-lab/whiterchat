import React, { useState } from 'react';
import { GeneratedImageRef, GENERATED_IMAGES } from '../types/logo';
import { Eye, Download, Maximize2, Sparkles, Check, Info, ZoomIn, X } from 'lucide-react';

export const RenderGallery: React.FC = () => {
  const [selectedImg, setSelectedImg] = useState<GeneratedImageRef>(GENERATED_IMAGES[0]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleDownload = (img: GeneratedImageRef) => {
    const link = document.createElement('a');
    link.href = img.path;
    link.download = `aether_lens_${img.id}_render.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCopiedId(img.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
            Ultra-Clean 3D Studio Renders
          </span>
          <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white mt-1">
            4K Refined Master Logo Artifacts
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl mt-1">
            Generated using studio lighting, pearl white glassmorphism materials, icy cyan core diffusion, and polished silver bevels on minimalist cool-white and obsidian canvases.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
            <Sparkles className="w-3.5 h-3.5" />
            <span>4K Presentation Ready</span>
          </span>
        </div>
      </div>

      {/* Main Showcase Banner / Active Image */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 8 cols: Large Feature View */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative group rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
            <img
              src={selectedImg.path}
              alt={selectedImg.title}
              referrerPolicy="no-referrer"
              className="w-full h-auto object-cover max-h-[560px] transition-transform duration-500 group-hover:scale-[1.01]"
            />

            {/* Floating Overlay Controls */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-6 text-white">
              <div className="flex justify-between items-start">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md border border-white/30">
                  {selectedImg.category} · {selectedImg.aspectRatio}
                </span>
                <button
                  onClick={() => setIsLightboxOpen(true)}
                  className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md hover:bg-white/30 text-white transition-all"
                  title="Expand Fullscreen Lightbox"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div>
                  <h3 className="font-display font-bold text-xl text-white">{selectedImg.title}</h3>
                  <p className="text-xs text-slate-200/90 max-w-lg mt-1 line-clamp-2">{selectedImg.description}</p>
                </div>
                <button
                  onClick={() => handleDownload(selectedImg)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 font-semibold text-xs hover:bg-cyan-50 transition-colors shadow-lg shrink-0"
                >
                  {copiedId === selectedImg.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4 text-slate-800" />}
                  <span>{copiedId === selectedImg.id ? 'Saved!' : 'Download 4K'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 cols: Thumbnail Grid & Metadata Breakdown */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Select Render View
          </h3>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            {GENERATED_IMAGES.map((img) => {
              const isSelected = selectedImg.id === img.id;
              return (
                <button
                  key={img.id}
                  onClick={() => setSelectedImg(img)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/40 shadow-xs ring-1 ring-cyan-500'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:border-slate-300'
                  }`}
                >
                  <img
                    src={img.path}
                    alt={img.title}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-lg object-cover shrink-0 border border-black/10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold truncate ${isSelected ? 'text-cyan-900 dark:text-cyan-200' : 'text-slate-800 dark:text-slate-200'}`}>
                      {img.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {img.category}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Design System Properties Card */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Info className="w-3.5 h-3.5 text-cyan-500" />
              <span>Render Specifications</span>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 font-mono">
              <li className="flex justify-between">
                <span>Geometry:</span>
                <span className="text-slate-900 dark:text-white font-medium">8 Interlocking Blades</span>
              </li>
              <li className="flex justify-between">
                <span>Materials:</span>
                <span className="text-slate-900 dark:text-white font-medium">Pearl White + Glassmorphism</span>
              </li>
              <li className="flex justify-between">
                <span>Lighting:</span>
                <span className="text-slate-900 dark:text-white font-medium">Subsurface Icy Cyan Diffusion</span>
              </li>
              <li className="flex justify-between">
                <span>Frame:</span>
                <span className="text-slate-900 dark:text-white font-medium">Rounded Octagonal Ring</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8">
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center space-y-4">
            <img
              src={selectedImg.path}
              alt={selectedImg.title}
              referrerPolicy="no-referrer"
              className="max-h-[75vh] w-auto object-contain rounded-xl shadow-2xl border border-white/10"
            />
            <div className="text-center text-white space-y-1">
              <h3 className="font-display font-bold text-lg">{selectedImg.title}</h3>
              <p className="text-xs text-slate-300 max-w-xl">{selectedImg.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
