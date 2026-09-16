import { Link } from "wouter";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { Scale, Shield, FileText, Cookie, Copyright, Accessibility, Lock, ChevronRight, ExternalLink } from "lucide-react";

export default function LegalCenterPage() {
  const { t, isRtl } = useI18n();

  const legalDocuments = [
    {
      title: t("Privacy Policy", "سياسة الخصوصية"),
      desc: t(
        "Details what data is collected, encryption standards, retention periods, and your privacy rights under global frameworks.",
        "تفاصيل البيانات المجمعة ومعايير التشفير وفترات الحفظ وحقوق الخصوصية الخاصة بك."
      ),
      link: "/privacy",
      icon: Shield,
    },
    {
      title: t("Terms of Service", "شروط الاستخدام"),
      desc: t(
        "The primary legal contract establishing acceptable use, content licensing, and account policies.",
        "العقد القانوني الأساسي المنظم للاستخدام المقبول وترخيص المحتوى وسياسات الحسابات."
      ),
      link: "/terms",
      icon: FileText,
    },
    {
      title: t("Cookie Policy", "سياسة ملفات تعريف الارتباط"),
      desc: t(
        "Explains essential security tokens, preference cookies, and controls for tracking minimization.",
        "توضيح ملفات الأمان الأساسية وملفات حفظ التفضيلات وخيارات التحكم بالكوكيز."
      ),
      link: "/cookies",
      icon: Cookie,
    },
    {
      title: t("Copyright & IP Policy (DMCA)", "حقوق الملكية الفكرية والنشر"),
      desc: t(
        "Guidelines for intellectual property ownership, authorized use, and notice-and-takedown procedures.",
        "إرشادات حماية الملكية الفكرية وإجراءات تقديم إخطارات انتهاك حقوق النشر والإزالة."
      ),
      link: "/copyright",
      icon: Copyright,
    },
    {
      title: t("Platform Rules & Enforcement", "قواعد المنصة وتطبيق الإجراءات"),
      desc: t(
        "Clear prohibitions regarding harassment, nudity, automated bot spam, and appeal processes.",
        "المحظورات الصريحة المتعلقة بالتنمر والمحتوى غير اللائق والروبوتات وإجراءات المراجعة."
      ),
      link: "/rules",
      icon: Scale,
    },
    {
      title: t("Accessibility Statement", "بيان إمكانية الوصول الشامل"),
      desc: t(
        "Our commitment to WCAG AA accessibility standards, screen reader compatibility, and contrast requirements.",
        "التزامنا بمعايير الوصول العالمية WCAG AA وتوافق قارئات الشاشة والتباين البصري."
      ),
      link: "/accessibility",
      icon: Accessibility,
    },
  ];

  return (
    <InstitutionalLayout
      activeSection="legal"
      pageTitle={t("Legal & Compliance Hub", "المركز القانوني والامتثال")}
      pageSubtitle={t(
        "Access all official policies, regulatory compliance disclosures, and operational legal terms for WhiterChat.",
        "دليلك الموحد لجميع السياسات الرسمية والشروط القانونية والتنظيمية لمنصة WhiterChat."
      )}
    >
      <SEOHead
        title={t("Legal & Compliance Hub | WhiterChat", "المركز القانوني والامتثال | منصة WhiterChat")}
        description={t(
          "Browse WhiterChat's official legal terms including Privacy Policy, Terms of Service, Cookie Policy, and Copyright guidelines.",
          "تصفح كافة الوثائق القانونية لمنصة WhiterChat: سياسة الخصوصية، شروط الاستخدام، الكوكيز، وحقوق الملكية."
        )}
        canonicalPath="/legal"
      />

      <div className="max-w-5xl mx-auto space-y-12">
        {/* Hub Grid */}
        <div className="grid sm:grid-cols-2 gap-6">
          {legalDocuments.map((doc, idx) => {
            const Icon = doc.icon;
            return (
              <Link key={idx} href={doc.link}>
                <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm hover:border-primary/50 transition-all cursor-pointer group flex flex-col justify-between gap-4 h-full">
                  <div className="space-y-3">
                    <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{doc.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-primary pt-2 border-t border-border/40">
                    <span>{t("Read Policy", "قراءة السياسة")}</span>
                    <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Legal Contact Box */}
        <div className="p-6 rounded-2xl bg-muted/30 border border-border text-xs text-muted-foreground space-y-2">
          <strong className="text-foreground text-sm block">{t("Legal Counsel & Inquiries", "التواصل القانوني والاستفسارات")}</strong>
          <p>
            {t(
              "For formal legal notices, regulatory inquiries, or court-issued subpoenas, please contact legal@whiterchat.com.",
              "للإخطارات القانونية الرسمية والاستفسارات التنظيمية، يرجى مراسلتنا عبر البريد الإلكتروني legal@whiterchat.com."
            )}
          </p>
        </div>
      </div>
    </InstitutionalLayout>
  );
}
