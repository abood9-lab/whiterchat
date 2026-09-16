import { useState } from "react";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { Cookie, Shield, CheckCircle2, RotateCcw, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function CookiePolicyPage() {
  const { t, isRtl } = useI18n();
  const { toast } = useToast();

  const resetCookies = () => {
    localStorage.removeItem("whiterchat_cookie_consent");
    toast({
      title: t("Cookie Preferences Reset", "تمت إعادة تعيين تفضيلات الكوكيز"),
      description: t("The preference banner will appear on your next page refresh.", "ستظهر نافذة التفضيلات مجددًا عند تحديث الصفحة."),
    });
  };

  const cookieList = [
    {
      name: "token / whiterchat_token",
      category: t("Essential Security", "أمان أساسي"),
      purpose: t("Stores cryptographically signed JWT auth tokens for secure user sessions.", "تخزين رمز المصادقة المشفر (JWT) لإدارة تسجيل الدخول الآمن."),
      expiry: t("30 Days / Session", "٣٠ يومًا أو حتى تسجيل الخروج"),
    },
    {
      name: "theme",
      category: t("Preferences", "تفضيلات المستخدم"),
      purpose: t("Remembers your choice of Light or Dark visual mode.", "حفظ خيارك المفضل للوضع الليلي أو الفاتح."),
      expiry: t("Persistent", "دائم محليًا"),
    },
    {
      name: "whiterchat_lang",
      category: t("Preferences", "تفضيلات اللغة"),
      purpose: t("Stores your selected language (English or Arabic RTL).", "حفظ لغة الواجهة المختارة (الإنجليزية أو العربية)."),
      expiry: t("Persistent", "دائم محليًا"),
    },
    {
      name: "whiterchat_cookie_consent",
      category: t("Essential Compliance", "الامتثال والخصوصية"),
      purpose: t("Records your explicit choices regarding optional cookie telemetry.", "حفظ خياراتك المسجلة بخصوص تفضيلات الكوكيز والخصوصية."),
      expiry: t("1 Year", "سنة واحدة"),
    },
  ];

  return (
    <InstitutionalLayout
      activeSection="cookies"
      pageTitle={t("Cookie Policy & Telemetry", "سياسة ملفات تعريف الارتباط")}
      pageSubtitle={t(
        "Transparency regarding how we use cookies, local tokens, and browser storage on WhiterChat.",
        "شفافية كاملة حول كيفية استخدام ملفات تعريف الارتباط والتخزين المحلي في منصة WhiterChat."
      )}
    >
      <SEOHead
        title={t("Cookie Policy & Browser Storage | WhiterChat", "سياسة الكوكيز والتخزين المحلي | WhiterChat")}
        description={t(
          "Read WhiterChat's Cookie Policy to learn about essential security tokens, preference storage, and how to manage your privacy consent.",
          "اطلع على تفاصيل ملفات تعريف الارتباط ورموز الأمان الأساسية وكيفية إدارة خياراتك في WhiterChat."
        )}
        canonicalPath="/cookies"
      />

      <div className="max-w-4xl mx-auto space-y-10">
        {/* Intro */}
        <section className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Cookie className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{t("What Are Cookies and Local Storage?", "ما هي ملفات تعريف الارتباط والتخزين المحلي؟")}</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t(
              "Cookies and browser localStorage are small text items placed on your device to ensure secure authentication, maintain login sessions, remember interface preferences, and prevent fraudulent abuse.",
              "ملفات تعريف الارتباط (Cookies) والتخزين المحلي هي عناصر نصية صغيرة تُحفظ على جهازك لضمان تسجيل الدخول الآمن، وحفظ تفضيلاتك كاللغة والمظهر، وتفادي الاحتيال والهجمات الإلكترونية."
            )}
          </p>
        </section>

        {/* Detailed Table */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-foreground">{t("List of Storage Items Used", "جدول الملفات المستخدمة بالمنصة")}</h3>
          <div className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-sm">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-muted/50 border-b border-border text-foreground font-bold">
                <tr>
                  <th className="p-3.5">{t("Item Key", "اسم الملف")}</th>
                  <th className="p-3.5">{t("Category", "الفئة")}</th>
                  <th className="p-3.5">{t("Purpose", "الغرض والوظيفة")}</th>
                  <th className="p-3.5">{t("Retention", "مدة الحفظ")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-muted-foreground">
                {cookieList.map((c, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="p-3.5 font-mono text-foreground font-semibold">{c.name}</td>
                    <td className="p-3.5">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                        {c.category}
                      </span>
                    </td>
                    <td className="p-3.5">{c.purpose}</td>
                    <td className="p-3.5 font-mono">{c.expiry}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Manage Preferences Action */}
        <section className="p-6 rounded-2xl bg-muted/30 border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left rtl:sm:text-right">
            <h4 className="font-bold text-sm text-foreground">{t("Reset Cookie Consent Choices", "إعادة ضبط خيارات الكوكيز")}</h4>
            <p className="text-xs text-muted-foreground">
              {t("Clear stored preference cookies to re-display the consent selection banner.", "امسح الخيارات المحفوظة لإظهار شريط الموافقة من جديد واختيار تفضيلاتك.")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={resetCookies} className="gap-2 shrink-0">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t("Reset Preferences", "إعادة التعيين")}</span>
          </Button>
        </section>
      </div>
    </InstitutionalLayout>
  );
}
