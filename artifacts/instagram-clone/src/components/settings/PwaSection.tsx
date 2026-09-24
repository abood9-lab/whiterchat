import React, { useState } from "react";
import { Download, Smartphone, CheckCircle2, Share2, PlusSquare, ArrowDownCircle, ShieldCheck, Zap } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function PwaSection() {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { toast } = useToast();

  const handleDownloadClick = async () => {
    if (isInstalled) {
      toast({ title: "App Already Installed", description: "You are currently using the installed WhiterChat PWA app." });
      return;
    }

    if (isInstallable) {
      const success = await install();
      if (success) {
        toast({ title: "Download Successful!", description: "WhiterChat has been installed on your device." });
      }
    } else {
      setShowIOSGuide(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div>
        <h3 className="text-lg font-bold text-foreground">Download & Install App (PWA)</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Download and install WhiterChat directly onto your phone or computer for a fast, ad-free native app experience.
        </p>
      </div>

      {/* Main Download Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-primary/10 via-card to-purple-500/10 border border-primary/20 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md">
              <Smartphone className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-foreground">WhiterChat Progressive Web App</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isInstalled
                  ? "App is currently installed and running in standalone mode."
                  : "Ready for instant download and installation to your home screen."}
              </p>
            </div>
          </div>

          <Button
            onClick={handleDownloadClick}
            size="lg"
            className="w-full sm:w-auto font-bold rounded-2xl px-6 h-12 gap-2.5 shadow-md shadow-primary/25 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
          >
            {isInstalled ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Installed</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5 animate-bounce" />
                <span>Download App Now</span>
              </>
            )}
          </Button>
        </div>

        {/* Highlights Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-card/80 border border-border/70 flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-foreground">Lightning Fast</p>
              <p className="text-muted-foreground text-[11px]">Instant loading & smooth animations</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card/80 border border-border/70 flex items-center gap-3">
            <ArrowDownCircle className="w-5 h-5 text-blue-500 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-foreground">Offline Support</p>
              <p className="text-muted-foreground text-[11px]">Works seamlessly even offline</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card/80 border border-border/70 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-foreground">Secure & Store-Free</p>
              <p className="text-muted-foreground text-[11px]">Safe 1-click installation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Instructions for iOS / Chrome Browser fallback */}
      <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
          Manual Installation Instructions
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-2">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Share2 className="w-4 h-4 text-primary" />
              <span>iPhone & iPad (iOS Safari)</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px]">
              <li>Tap the <strong>Share</strong> button at the bottom of Safari.</li>
              <li>Scroll down and select <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong> to put WhiterChat on your home screen.</li>
            </ol>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-2">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <PlusSquare className="w-4 h-4 text-primary" />
              <span>Android & Chrome Browser</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px]">
              <li>Tap the menu button (3 dots) at the top right of Chrome.</li>
              <li>Select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.</li>
              <li>Confirm installation and the download will start immediately.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* iOS Modal Guide */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setShowIOSGuide(false)}
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
                Follow these simple steps to install WhiterChat on your home screen:
              </p>
            </div>

            <div className="text-left space-y-3 bg-muted/40 p-4 rounded-2xl border border-border/60 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/15 text-primary shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-foreground">1. Tap Share Button</span>
                  <p className="text-muted-foreground mt-0.5">In your browser navigation bar.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/15 text-primary shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-foreground">2. Select Add to Home Screen</span>
                  <p className="text-muted-foreground mt-0.5">Confirm by tapping Add.</p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-xl font-bold"
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
