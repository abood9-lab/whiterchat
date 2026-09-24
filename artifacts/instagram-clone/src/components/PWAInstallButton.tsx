import React, { useState } from "react";
import { Download, Smartphone, CheckCircle, Share2, PlusSquare } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { Button } from "./ui/button";

export const PWAInstallButton: React.FC<{ variant?: "compact" | "banner" | "sidebar" | "settings" }> = ({
  variant = "compact",
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If running as standalone app, show active status in Settings or hide elsewhere
  if (isInstalled) {
    if (variant === "settings") {
      return (
        <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-400">PWA Installed</p>
              <p className="text-xs text-muted-foreground">Running as standalone native web app</p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-[11px] font-bold bg-emerald-500 text-black rounded-full">
            Active
          </span>
        </div>
      );
    }
    return null;
  }

  // Handle Install Action
  const handleInstall = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // General instructions modal
      setShowIOSModal(true);
    }
  };

  // Settings Variant
  if (variant === "settings") {
    return (
      <>
        <div className="flex items-center justify-between p-4 bg-muted/40 border border-border rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Install WhiterChat App</p>
              <p className="text-xs text-muted-foreground">
                Install as a standalone app on your device for instant launch & offline support.
              </p>
            </div>
          </div>
          <Button
            onClick={handleInstall}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 py-2 rounded-xl shadow-sm"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Install App
          </Button>
        </div>

        {/* iOS / General Helper Modal */}
        {showIOSModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
            onClick={() => setShowIOSModal(false)}
          >
            <div
              className="relative w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl p-6 text-center space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Smartphone className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold">Install on your Device</h3>
                <p className="text-xs text-muted-foreground">
                  Follow these simple steps to install WhiterChat:
                </p>
              </div>

              <div className="text-left space-y-3 bg-muted/40 p-4 rounded-2xl border border-border/60 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-primary/15 text-primary shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">1. Tap the Share button</span>
                    <p className="text-muted-foreground mt-0.5">Found at the bottom or top of your browser.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-primary/15 text-primary shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">2. Select &apos;Add to Home Screen&apos;</span>
                    <p className="text-muted-foreground mt-0.5">WhiterChat will be added directly to your home screen.</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowIOSModal(false)}
                className="w-full rounded-xl font-semibold"
              >
                Got it
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Sidebar / Compact Variant
  return (
    <>
      <button
        onClick={handleInstall}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/15 transition-all border border-primary/20 shadow-xs"
      >
        <Download className="w-4 h-4 text-primary" />
        <span>Install App</span>
      </button>

      {/* Helper Modal */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="relative w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl p-6 text-center space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Smartphone className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold">Install WhiterChat</h3>
              <p className="text-xs text-muted-foreground">
                Install as a fast, full-screen web app on your device:
              </p>
            </div>

            <div className="text-left space-y-3 bg-muted/40 p-4 rounded-2xl border border-border/60 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/15 text-primary shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-foreground">1. Tap browser menu or Share</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/15 text-primary shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-foreground">2. Select &apos;Add to Home Screen&apos; or &apos;Install&apos;</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowIOSModal(false)}
              className="w-full rounded-xl font-semibold"
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
