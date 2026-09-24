import React from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <aside
      aria-label="Offline status banner"
      className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-900/95 dark:bg-zinc-900/95 text-zinc-100 px-4 py-2.5 rounded-full border border-amber-500/40 shadow-2xl backdrop-blur-md text-xs font-medium animate-bounce sm:animate-none"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
        </span>
        <WifiOff className="w-4 h-4 text-amber-400" />
        <span>Offline Mode — Cached pages available</span>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2 py-1 rounded-full transition-colors font-semibold"
      >
        <RefreshCw className="w-3 h-3" />
        <span>Retry</span>
      </button>
    </aside>
  );
};
