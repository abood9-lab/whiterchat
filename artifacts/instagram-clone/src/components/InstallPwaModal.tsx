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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 text-center overflow-hidden">
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
            تثبيت تطبيق WhiterChat
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            استمتع بتجربة أسرع، إشعارات فورية، واستخدام بدون إنترنت عبر تثبيت تطبيق WhiterChat على شاشتك الرئيسية!
          </p>
        </div>

        {/* Features List */}
        <div className="grid grid-cols-2 gap-3 text-xs text-start bg-muted/40 p-4 rounded-2xl border border-border/60">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium text-foreground">وصول فوري وسريع</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium text-foreground">إشعارات الرسائل</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium text-foreground">شاشة كاملة بدون إطار</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium text-foreground">يعمل دون اتصال</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={handleInstallClick}
            className="w-full h-12 rounded-2xl font-bold gap-2 text-base shadow-lg shadow-primary/25"
          >
            <Download className="w-5 h-5" />
            تثبيت التطبيق الآن
          </Button>
          <Button
            variant="ghost"
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ليس الآن
          </Button>
        </div>
      </div>
    </div>
  );
}
