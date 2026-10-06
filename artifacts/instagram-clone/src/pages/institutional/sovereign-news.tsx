import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { SovereignNewsSection } from "@/components/institutional/SovereignNewsSection";
import { useI18n } from "@/lib/i18n";
import { Shield, Cpu, Lock, Layers, Globe, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function SovereignNewsPage() {
  const { t, isRtl } = useI18n();

  const pillars = [
    {
      title: t("Cloud Independence", "استقلالية السحابة"),
      desc: t(
        "Self-hosted & air-gapped infrastructure that operates free from foreign provider kill-switches.",
        "بنية تحتية ذاتية الاستضافة تعمل بمعزل عن مفاتيح تعطيل المزودين الأجانب."
      ),
      icon: Layers,
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: t("Data Autonomy", "السيادة على البيانات"),
      desc: t(
        "Strict geo-fenced data vaulting ensuring cryptographic key ownership stays in-country.",
        "تخزين مشفر ومسياج جغرافياً يضمن بقاء ملكية مفاتيح التشفير داخل الحدود."
      ),
      icon: Lock,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: t("AI Sovereignty", "السيادة على الذكاء الاصطناعي"),
      desc: t(
        "Localized foundation models trained and executed on air-gapped national GPU enclaves.",
        "نماذج لغوية أساسية محليّة يتم تدريبها وتشغيلها على بيئات معالجة معزولة."
      ),
      icon: Cpu,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    },
    {
      title: t("Cyber Resilience", "الصلابة السيبرانية"),
      desc: t(
        "Zero-trust, multi-party communications capable of surviving global internet outages.",
        "اتصالات بآلية الصفر ثقة قادرة على الاستمرار حتى عند انقطاع شبكات الربط الدولية."
      ),
      icon: Shield,
      color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
    },
  ];

  return (
    <InstitutionalLayout
      activeSection="press"
      pageTitle={t("Sovereign Infrastructure Intelligence", "استخبارات البنية التحتية السيادية")}
      pageSubtitle={t(
        "Real-time news, regulatory updates, and expert analysis on digital sovereignty, cloud autonomy, and national AI.",
        "أخبار وتحديثات اللوائح وتحليلات الخبراء حول السيادة الرقمية والاستقلالية السحابية والذكاء الاصطناعي الوطني."
      )}
    >
      <SEOHead
        title={t(
          "Sovereign Digital Infrastructure News & Insights | WhiterChat",
          "أخبار وتحليلات البنية التحتية الرقمية السيادية | WhiterChat"
        )}
        description={t(
          "Stay informed with live AI-curated intelligence on cloud sovereignty, data residency laws, localized KMS, and sovereign AI clusters.",
          "تابع الأخبار والتحليلات المباشرة حول السحابة السيادية وقوانين توطين البيانات واستقلالية الذكاء الاصطناعي."
        )}
        canonicalPath="/sovereign-news"
      />

      <div className="max-w-6xl mx-auto space-y-12">
        {/* ── Sovereign Infrastructure Pillars Overview ───────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map((pillar, idx) => {
            const IconComponent = pillar.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3 hover:border-primary/40 transition-all"
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${pillar.color}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-foreground text-sm">{pillar.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{pillar.desc}</p>
                </div>
              </div>
            );
          })}
        </section>

        {/* ── Main News Component ───────────────────────────────────────────── */}
        <SovereignNewsSection />

        {/* ── PIWAIC Sovereign Architecture CTA ────────────────────────────── */}
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-purple-900/30 via-card to-indigo-900/30 border border-purple-500/30 text-center space-y-6 relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30">
              {t("PIWAIC Architecture", "معمارية PIWAIC السيادية")}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-foreground">
              {t("Build Your Enterprise on Sovereign Infrastructure", "ابنِ مؤسستك على بنية تحتية سيادية بالكامل")}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {t(
                "Learn how WhiterChat and PIWAIC combine social collaboration, sovereign cloud vaults, and air-gapped AI engines to protect organizational data.",
                "تعرف على كيفية دمج WhiterChat وPIWAIC للتواصل الاجتماعي والخزائن السحابية السيادية لحماية بيانات مؤسستك."
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/about">
              <Button className="rounded-xl px-6 font-semibold gap-2">
                <span>{t("Explore PIWAIC Story", "استكشف قصة PIWAIC")}</span>
                {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </Button>
            </Link>

            <Link href="/contact">
              <Button variant="outline" className="rounded-xl px-6 font-semibold border-border/80">
                <span>{t("Contact Sovereign Solutions Team", "التواصل مع فريق الحلول السيادية")}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </InstitutionalLayout>
  );
}
