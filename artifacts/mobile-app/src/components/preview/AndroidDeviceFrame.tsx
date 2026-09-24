import React, { useState, useEffect } from "react";
import { Wifi, BatteryMedium, Signal, Smartphone, RotateCcw, Volume2, ShieldCheck } from "lucide-react";

interface AndroidDeviceFrameProps {
  children: React.ReactNode;
}

export const AndroidDeviceFrame: React.FC<AndroidDeviceFrameProps> = ({ children }) => {
  const [time, setTime] = useState("");
  const [deviceModel, setDeviceModel] = useState<"pixel8" | "s24">("pixel8");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-2 sm:p-6 select-none">
      {/* Device Toolbar Header */}
      <div className="w-full max-w-[420px] mb-3 flex items-center justify-between px-2 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-semibold text-zinc-200">WhiterChat Android Engine</span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono">
            v1.0.0
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDeviceModel(deviceModel === "pixel8" ? "s24" : "pixel8")}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:text-white transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>{deviceModel === "pixel8" ? "Pixel 8 Pro" : "Galaxy S24"}</span>
          </button>
        </div>
      </div>

      {/* Realistic Mobile Device Container */}
      <div
        className={`relative w-full max-w-[410px] h-[860px] max-h-[92vh] bg-black rounded-[46px] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.1),inset_0_0_0_2px_rgba(255,255,255,0.05)] flex flex-col transition-all duration-300`}
      >
        {/* Hardware side buttons */}
        <div className="absolute -left-[5px] top-28 w-[3px] h-12 bg-zinc-700 rounded-l-xs" />
        <div className="absolute -left-[5px] top-44 w-[3px] h-20 bg-zinc-700 rounded-l-xs" />
        <div className="absolute -right-[5px] top-32 w-[3px] h-16 bg-zinc-700 rounded-r-xs" />

        {/* Screen Area */}
        <div className="relative w-full h-full bg-zinc-950 rounded-[36px] overflow-hidden flex flex-col border border-zinc-800/80 shadow-inner">
          {/* Android Status Bar */}
          <div className="h-7 bg-zinc-950/90 text-white px-6 flex items-center justify-between z-40 text-xs font-medium shrink-0">
            <span className="text-[11px] font-semibold tracking-tight">{time || "12:00"}</span>

            {/* Front Camera Punch Hole */}
            <div className="w-3.5 h-3.5 bg-black rounded-full border border-zinc-800 flex items-center justify-center -ml-2">
              <div className="w-1.5 h-1.5 bg-zinc-900 rounded-full" />
            </div>

            <div className="flex items-center gap-1.5 text-zinc-300">
              <Signal className="w-3 h-3 text-zinc-300" />
              <Wifi className="w-3 h-3 text-zinc-300" />
              <div className="flex items-center gap-0.5 text-[10px]">
                <BatteryMedium className="w-3.5 h-3.5 text-emerald-400" />
                <span>94%</span>
              </div>
            </div>
          </div>

          {/* Active App Viewport */}
          <div className="flex-1 w-full overflow-y-auto overflow-x-hidden relative scrollbar-none">
            {children}
          </div>

          {/* Android Gesture Navigation Bar */}
          <div className="h-4 bg-zinc-950 flex items-center justify-center shrink-0 z-40">
            <div className="w-32 h-1 bg-zinc-600/60 rounded-full" />
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 text-center text-xs text-zinc-500 flex items-center gap-3">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Connected to Live WhiterChat Backend & Database
        </span>
      </div>
    </div>
  );
};
