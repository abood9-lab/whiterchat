import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { Globe, Eye, Zap, Type, Check, Loader2 } from "lucide-react";

export function LanguageAccessibilitySection() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const currentLang = (user as any)?.language || "en";
  const [selectedLanguage, setSelectedLanguage] = useState<string>(currentLang);
  const [rtlMode, setRtlMode] = useState<boolean>((user as any)?.rtlMode ?? currentLang === "ar");

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    return localStorage.getItem("whiterchat_reduced_motion") === "true";
  });
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem("whiterchat_high_contrast") === "true";
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    if (lang === "ar") {
      setRtlMode(true);
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "ar";
    } else {
      setRtlMode(false);
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
    }
  };

  const handleToggleReducedMotion = (enabled: boolean) => {
    setReducedMotion(enabled);
    localStorage.setItem("whiterchat_reduced_motion", String(enabled));
    if (enabled) {
      document.documentElement.classList.add("reduce-motion");
    } else {
      document.documentElement.classList.remove("reduce-motion");
    }
  };

  const handleToggleHighContrast = (enabled: boolean) => {
    setHighContrast(enabled);
    localStorage.setItem("whiterchat_high_contrast", String(enabled));
    if (enabled) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/users/me/settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          language: selectedLanguage,
          rtlMode,
        }),
      });

      if (res.ok) {
        if (user) updateUser({ ...user, language: selectedLanguage, rtlMode } as any);
        toast({ title: "Language & Accessibility preferences saved!" });
      } else {
        toast({ title: "Failed to save settings", variant: "destructive" });
      }
    } catch {
      toast({ title: "An error occurred", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Language & Accessibility</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose your interface language, RTL orientation, and visual accessibility options.
        </p>
      </div>

      {/* Language Selector */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Interface Language</h3>
            <p className="text-xs text-muted-foreground">Select your preferred system language and layout</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {[
            { id: "en", name: "English (US)", native: "English", dir: "LTR" },
            { id: "ar", name: "Arabic (العربية)", native: "العربية", dir: "RTL" },
          ].map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => handleLanguageChange(lang.id)}
              className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                selectedLanguage === lang.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-muted/20 hover:bg-muted/40"
              }`}
            >
              <div>
                <div className="font-semibold text-sm">{lang.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{lang.native} • {lang.dir}</div>
              </div>
              {selectedLanguage === lang.id && (
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Accessibility Options */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-500" /> Visual & Motion Accessibility
        </h3>

        <div className="divide-y divide-border">
          {/* Reduced Motion */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Zap className="w-4 h-4 text-muted-foreground mt-1" />
              <div>
                <div className="font-semibold text-sm">Reduced Motion</div>
                <div className="text-xs text-muted-foreground">
                  Minimize non-essential interface animations, transitions, and zoom effects.
                </div>
              </div>
            </div>
            <Switch checked={reducedMotion} onCheckedChange={handleToggleReducedMotion} />
          </div>

          {/* High Contrast */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Eye className="w-4 h-4 text-muted-foreground mt-1" />
              <div>
                <div className="font-semibold text-sm">High Contrast Mode</div>
                <div className="text-xs text-muted-foreground">
                  Increase border sharpness and text contrast for easier readability.
                </div>
              </div>
            </div>
            <Switch checked={highContrast} onCheckedChange={handleToggleHighContrast} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto px-6 h-10 font-semibold bg-primary text-primary-foreground">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
