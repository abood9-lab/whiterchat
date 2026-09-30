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
      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-700">
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shadow-2xl ring-2 ring-cyan-500/40 shadow-cyan-500/20">
          <img
            src="/logo.png"
            alt="WhiterChat"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="font-serif italic text-4xl sm:text-5xl font-bold text-white tracking-tight drop-shadow-lg">
            WhiterChat
          </span>
          <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-cyan-400/90">
            Social &amp; Messaging
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

