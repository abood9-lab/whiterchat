import { useState, useEffect } from "react";
import { Download, Smartphone, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPwaModal({ 
  forceOpen = false, 
  onClose 
}: { 
  forceOpen?: boolean; 
  onClose?: () => void; 
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    // Check if already dismissed in this session
    const dismissed = sessionStorage.getItem("whiterchat_pwa_dismissed");
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Automatically show modal on first visit to Home if prompt is ready
      setIsOpen(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // If standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [forceOpen]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback instruction for iOS or browsers without native prompt
      alert("To install WhiterChat:\n• On iOS Safari: Tap the Share button and select 'Add to Home Screen'.\n• On Android/Desktop Chrome: Click the browser menu (⋮) and select 'Install app' or 'Add to Home screen'.");
    }
    setIsOpen(false);
    sessionStorage.setItem("whiterchat_pwa_dismissed", "true");
    if (onClose) onClose();
  };

  const handleDismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem("whiterchat_pwa_dismissed", "true");
    if (onClose) onClose();
  };

  if (!isOpen && !forceOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn"
      onClick={handleDismiss}
    >
      <div
        className="relative w-full max-w-none sm:max-w-md bg-card border-t sm:border border-border rounded-t-[28px] sm:rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 text-center overflow-hidden max-h-[90dvh] overflow-y-auto pb-[max(1.5rem,calc(1.5rem+env(safe-area-inset-bottom)))] sm:pb-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="mx-auto -mt-3 -mb-2 h-1.5 w-12 rounded-full bg-muted-foreground/30 sm:hidden shrink-0 pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="mx-auto w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
          <Smartphone className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Install WhiterChat App
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enjoy a faster experience, instant notifications, and full-screen view by installing WhiterChat on your device.
          </p>
        </div>

        {/* Features List */}
        <div className="grid grid-cols-2 gap-3 text-xs text-start bg-muted/40 p-4 rounded-2xl border border-border/60">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium text-foreground">Instant Fast Access</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium text-foreground">Push Notifications</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium text-foreground">Full-screen Window</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium text-foreground">Offline Reliability</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={handleInstallClick}
            className="w-full h-12 rounded-2xl font-bold gap-2 text-base shadow-lg shadow-primary/25"
          >
            <Download className="w-5 h-5" />
            Install App Now
          </Button>
          <Button
            variant="ghost"
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
