import React from "react";
import { Sparkles, RefreshCw, X } from "lucide-react";
import { usePWAUpdate } from "../hooks/usePWAUpdate";
import { Button } from "./ui/button";

export const PWAUpdateToast: React.FC = () => {
  const { showUpdate, updateApp, dismissUpdate } = usePWAUpdate();

  if (!showUpdate) return null;

  return (
    <aside
      aria-label="New version notification"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] bg-zinc-950/95 dark:bg-zinc-950/95 text-white border border-emerald-500/40 rounded-2xl shadow-2xl backdrop-blur-xl p-4 flex items-center justify-between gap-3 animate-fadeIn"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="text-left">
          <p className="text-xs font-bold text-emerald-400">New Update Available</p>
          <p className="text-xs text-zinc-300">Update WhiterChat for new features</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={updateApp}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-8 px-3 rounded-lg shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Update
        </Button>
        <button
          onClick={dismissUpdate}
          className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
