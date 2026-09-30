import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { Accessibility, Eye, Volume2, Monitor, Keyboard, CheckCircle2 } from "lucide-react";

export default function AccessibilityPage() {
  const { t, isRtl } = useI18n();

  const standards = [
    {
      title: t("WCAG 2.1 AA Color Contrast", "معايير التباين البصري WCAG AA"),
      desc: t(
        "All text elements meet minimum 4.5:1 contrast ratios across both Light and Dark visual modes.",
        "تلتزم كافة النصوص بنسبة تباين لا تقل عن 4.5:1 لضمان القراءة المريحة في الوضعين الفاتح والداكن."
      ),
      icon: Eye,
    },
    {
      title: t("Full Keyboard Navigation", "التنقل الكامل عبر لوحة المفاتيح"),
      desc: t(
        "Users can navigate through feeds, modals, forms, and video controls using standard Tab, Enter, and Arrow keys.",
        "إمكانية تصفح الخلاصات والنوافذ وعناصر تحكم الفيديو بسلاسة باستخدام لوحة المفاتيح."
      ),
      icon: Keyboard,
    },
    {
      title: t("Screen Reader & ARIA Semantics", "دعم قارئات الشاشة ووسوم ARIA"),
      desc: t(
        "Interactive buttons, icons, and dialogs provide semantic ARIA labels and roles for assistive screen readers.",
        "تزويد الأزرار والأيقونات والنوافذ بوسوم ARIA الدقيقة لتسهيل قراءتها بواسطة برامج الوصول."
      ),
      icon: Volume2,
    },
    {
      title: t("Bilingual RTL/LTR Alignment", "محاذاة كاملة للاتجاهين (RTL وLTR)"),
      desc: t(
        "Native right-to-left layout support for Arabic text ensuring natural reading flow and proportional spacing.",
        "دعم أصيل للغة العربية من اليمين لليسار مع الحفاظ على التناسق البصري للخطوط والأزرار."
      ),
      icon: Monitor,
    },
  ];

  return (
    <InstitutionalLayout
      activeSection="accessibility"
      pageTitle={t("Accessibility Statement", "بيان إمكانية الوصول الشامل")}
      pageSubtitle={t(
        "Our ongoing commitment to ensuring WhiterChat is accessible, usable, and welcoming for everyone.",
        "التزامنا المستمر بضمان سهولة استخدام منصة WhiterChat ووصول الجميع إليها دون أي عوائق."
      )}
    >
      <SEOHead
        title={t("Accessibility Statement | WhiterChat", "بيان إمكانية الوصول | منصة WhiterChat")}
        description={t(
          "Learn about WhiterChat's adherence to WCAG 2.1 AA accessibility standards, keyboard navigation, and screen reader support.",
          "تعرف على التزام WhiterChat بمعايير الوصول العالمية ودعم لوحة المفاتيح وقارئات الشاشة."
        )}
        canonicalPath="/accessibility"
      />

      <div className="max-w-4xl mx-auto space-y-10">
        {/* Intro */}
        <section className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <Accessibility className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground">{t("Inclusive Design Principles", "مبادئ التصميم الشامل")}</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t(
              "We believe digital social connection must be accessible to individuals of all abilities. Our engineering and design teams actively test and optimize our interface against Web Content Accessibility Guidelines (WCAG) 2.1 Level AA.",
              "نؤمن بأن التواصل الاجتماعي الرقمي حق للجميع بمختلف قدراتهم. وتعمل فرق التصميم والهندسة لدينا على اختبار وتحسين واجهات التطبيق وفقًا لأحدث المعايير العالمية."
            )}
          </p>
        </section>

        {/* Standards Grid */}
        <section className="grid sm:grid-cols-2 gap-6">
          {standards.map((st, i) => {
            const Icon = st.icon;
            return (
              <div key={i} className="p-6 rounded-2xl bg-card border border-border/80 space-y-3">
                <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">{st.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{st.desc}</p>
              </div>
            );
          })}
        </section>

        {/* Feedback Section */}
        <section className="p-6 rounded-2xl bg-muted/30 border border-border text-xs text-muted-foreground space-y-2">
          <strong className="text-foreground text-sm block">{t("Accessibility Feedback", "ملاحظات إمكانية الوصول")}</strong>
          <p>
            {t(
              "If you encounter an accessibility barrier on WhiterChat, please let us know via accessibility@whiterchat.com or submit a report on our Contact page.",
              "إذا واجهت أي صعوبة في الوصول أو التصفح على المنصة، يرجى إبلاغنا عبر accessibility@whiterchat.com أو عبر صفحة التواصل."
            )}
          </p>
        </section>
      </div>
    </InstitutionalLayout>
  );
}
