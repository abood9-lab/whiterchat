import React from 'react';
import { Layers, Sparkles, Download, Palette, ShieldCheck, Sun, Moon } from 'lucide-react';
import { LogoConfig } from '../types/logo';

interface HeaderProps {
  activeTab: 'studio' | 'gallery' | 'brand' | 'scale';
  setActiveTab: (tab: 'studio' | 'gallery' | 'brand' | 'scale') => void;
  config: LogoConfig;
  setConfig: React.Dispatch<React.SetStateAction<LogoConfig>>;
  onOpenExportModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  config,
  setConfig,
  onOpenExportModal,
}) => {
  const isDark = config.bgMode === 'deep_dark';

  const toggleDarkMode = () => {
    setConfig((prev) => ({
      ...prev,
      bgMode: prev.bgMode === 'deep_dark' ? 'cool_white' : 'deep_dark',
    }));
  };

  return (
    <header className={`sticky top-0 z-40 transition-colors duration-200 border-b ${
      isDark ? 'bg-slate-950/80 border-slate-800/80 text-white backdrop-blur-md' : 'bg-white/80 border-slate-200/80 text-slate-900 backdrop-blur-md'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Brand Title Wordmark */}
        <div className="flex items-center gap-3">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-slate-900 p-[1px] shadow-sm group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-900 rounded-[7px] flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full border border-cyan-400/80 bg-cyan-500/20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                </div>
              </div>
            </div>
            <span className="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900 dark:from-white dark:via-slate-200 dark:to-cyan-200 bg-clip-text text-transparent">
              AETHER LENS
            </span>
          </a>
        </div>

        {/* Zone 2: Navigation Links (4 clean items) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
          <button
            onClick={() => setActiveTab('studio')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'studio'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Interactive 3D Studio
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'gallery'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            4K Studio Renders
          </button>
          <button
            onClick={() => setActiveTab('scale')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'scale'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Scale & Favicon Test
          </button>
          <button
            onClick={() => setActiveTab('brand')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'brand'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Brand Identity System
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 transition-all shadow-sm shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Assets</span>
          </button>
        </div>
      </div>
    </header>
  );
};
