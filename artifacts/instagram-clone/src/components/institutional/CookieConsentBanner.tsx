import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Cookie, Shield, Check, X, Sliders, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function CookieConsentBanner() {
  const { t, isRtl } = useI18n();
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    preferences: true,
    analytics: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem("whiterchat_cookie_consent");
    if (!consent) {
      const timer = setTimeout(() => setShowBanner(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(
      "whiterchat_cookie_consent",
      JSON.stringify({ essential: true, preferences: true, analytics: true, date: new Date().toISOString() })
    );
    setShowBanner(false);
    setShowModal(false);
  };

  const handleEssentialOnly = () => {
    localStorage.setItem(
      "whiterchat_cookie_consent",
      JSON.stringify({ essential: true, preferences: false, analytics: false, date: new Date().toISOString() })
    );
    setShowBanner(false);
    setShowModal(false);
  };

  const handleSaveCustom = () => {
    localStorage.setItem(
      "whiterchat_cookie_consent",
      JSON.stringify({ ...preferences, essential: true, date: new Date().toISOString() })
    );
    setShowBanner(false);
    setShowModal(false);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Floating Bottom Banner */}
      <div
        dir={isRtl ? "rtl" : "ltr"}
        className="fixed bottom-4 inset-x-4 md:bottom-6 md:inset-x-auto md:right-6 md:max-w-xl z-50 bg-card/95 backdrop-blur-md border border-border rounded-2xl p-5 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-5"
      >
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
            <Cookie className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1.5">
            <h4 className="text-sm font-bold text-foreground">
              {t("Cookie & Privacy Preferences", "تفضيلات ملفات تعريف الارتباط والخصوصية")}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(
                "We use essential cookies to ensure safe logins and service security. With your consent, we also store basic preference settings. Review our",
                "نستخدم ملفات تعريف الارتباط الأساسية لضمان تسجيل الدخول الآمن وحماية الخدمة، وتخزين تفضيلاتك الأساسية. راجع"
              )}{" "}
              <Link href="/cookies" className="text-primary underline underline-offset-2 hover:opacity-80">
                {t("Cookie Policy", "سياسة الكوكيز")}
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowModal(true)}
            className="text-xs h-8 px-3 text-muted-foreground hover:text-foreground"
          >
            <Sliders className="w-3.5 h-3.5 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
            {t("Preferences", "تخصيص")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEssentialOnly}
            className="text-xs h-8 px-3 rounded-lg"
          >
            {t("Essential Only", "الأساسية فقط")}
          </Button>
          <Button
            size="sm"
            onClick={handleAcceptAll}
            className="text-xs h-8 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {t("Accept All", "قبول الكل")}
          </Button>
        </div>
      </div>

      {/* Preferences Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              {t("Customize Cookie Preferences", "تخصيص تفضيلات ملفات تعريف الارتباط")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Manage how WhiterChat uses cookies and local storage on your device. Essential security cookies cannot be deactivated.",
                "تحكم في كيفية استخدام WhiterChat للكوكيز على جهازك. ملفات الأمان الأساسية لازمة لعمل الحساب."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-3">
            {/* Essential */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-muted/40 border border-border/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {t("Essential Security & Session", "ملفات الأمان والجلسة الأساسية")}
                  </span>
                  <span className="text-[10px] font-semibold uppercase bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                    {t("Required", "مطلوب")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t(
                    "Required for token authentication, session encryption, and DDoS/abuse rate limiting.",
                    "ضرورية لمصادقة تسجيل الدخول الآمن، والتشفير، والحماية من الهجمات."
                  )}
                </p>
              </div>
              <input type="checkbox" checked disabled className="mt-1 h-4 w-4 rounded accent-primary cursor-not-allowed" />
            </div>

            {/* Preferences */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-muted/20 border border-border/40 hover:bg-muted/30 transition-colors">
              <div>
                <span className="text-sm font-semibold text-foreground">
                  {t("User Experience & UI Preferences", "تفضيلات تجربة المستخدم والواجهة")}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  {t(
                    "Remembers your dark/light theme, language selection (AR/EN), and audio volume levels.",
                    "لحفظ الوضع الليلي، واللغة المختارة (عربي/إنجليزي)، وإعدادات الصوت."
                  )}
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.preferences}
                onChange={(e) => setPreferences({ ...preferences, preferences: e.target.checked })}
                className="mt-1 h-4 w-4 rounded accent-primary cursor-pointer"
              />
            </div>

            {/* Analytics */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-muted/20 border border-border/40 hover:bg-muted/30 transition-colors">
              <div>
                <span className="text-sm font-semibold text-foreground">
                  {t("Anonymous Performance Telemetry", "قياس الأداء المجهول للخدمة")}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  {t(
                    "Helps us measure video buffering latencies and API responsiveness without tracking individual identity.",
                    "يساعدنا في قياس سرعة تشغيل الفيديوهات واستجابة الخوادم دون تتبع هويتك."
                  )}
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                className="mt-1 h-4 w-4 rounded accent-primary cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Button variant="ghost" size="sm" onClick={handleEssentialOnly} className="text-xs">
              {t("Reject Non-Essential", "رفض غير الأساسية")}
            </Button>
            <Button size="sm" onClick={handleSaveCustom} className="text-xs font-semibold px-4">
              {t("Save Preferences", "حفظ التفضيلات")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
