import { useEffect, useState } from "react";

const SPLASH_SESSION_KEY = "whiterchat_splash_shown";
const SPLASH_DURATION_MS = 2200;

/**
 * Full-screen intro splash shown once per browser session when the app first loads.
 * Displays the WhiterChat mark, the app name, and attribution.
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadingOut(true), SPLASH_DURATION_MS);
    const doneTimer = setTimeout(() => onDone(), SPLASH_DURATION_MS + 400);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-slate-950 text-white transition-opacity duration-500 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-700">
        <div className="h-32 w-32 rounded-3xl bg-slate-900/80 backdrop-blur-md shadow-2xl flex items-center justify-center ring-1 ring-cyan-500/30 overflow-hidden p-3 relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-transparent pointer-events-none" />
          <img src="/logo.png?v=3" alt="WhiterChat" className="h-full w-full object-contain rounded-2xl drop-shadow-md" />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="font-serif italic text-4xl sm:text-5xl font-bold text-white tracking-tight">
            WhiterChat
          </span>
          <span className="text-xs font-semibold tracking-[0.25em] uppercase text-cyan-400/90">
            Social & Messaging
          </span>
        </div>
      </div>
    </div>
  );
}

export function hasShownSplashThisSession() {
  try {
    return sessionStorage.getItem(SPLASH_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markSplashShown() {
  try {
    sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

