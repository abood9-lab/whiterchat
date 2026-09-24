import { Link } from "wouter";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { Building2, TrendingUp, Users, Sparkles, Shield, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BusinessPage() {
  const { t, isRtl } = useI18n();

  const businessPillars = [
    {
      title: t("Direct Creator Collaborations", "التعاون المباشر مع صناع المحتوى"),
      desc: t(
        "Connect with high-engagement creators in tech, fashion, art, and lifestyle for authentic visual storytelling.",
        "تواصل مع نخبة من صناع المحتوى في مجالات التقنية والأزياء والفنون لتقديم حملات تسويقية أصيلة ومؤثرة."
      ),
      icon: Users,
    },
    {
      title: t("Brand Authenticity & Safety", "أمان وموثوقية العلامات التجارية"),
      desc: t(
        "Benefit from strict community standards and proactive content moderation that protect brand reputation.",
        "استفد من معايير الأمان الصارمة والإشراف المستمر لضمان بيئة رقمية آمنة تحمي سمعة علامتك التجارية."
      ),
      icon: Shield,
    },
    {
      title: t("Rich Multimedia Showcase", "عرض وسائط متقدم ومتنوع"),
      desc: t(
        "Showcase products through high-resolution photo carousels, vertical video Reels, and 24-hour stories.",
        "اعرض منتجاتك عبر ألبومات الصور فائقة الدقة، ومقاطع الريلز، والقصص التفاعلية اليومية."
      ),
      icon: Sparkles,
    },
  ];

  return (
    <InstitutionalLayout
      activeSection="business"
      pageTitle={t("WhiterChat for Business & Partners", "الأعمال والشراكات")}
      pageSubtitle={t(
        "Grow your brand presence and engage a global, creative community through authentic visual storytelling.",
        "عزز حضور علامتك التجارية وتواصل مع مجتمع عالمي متفاعل عبر الوسائط البصرية الجذابة."
      )}
    >
      <SEOHead
        title={t("Business & Brand Partnerships | WhiterChat", "الأعمال وشراكات العلامات التجارية | WhiterChat")}
        description={t(
          "Discover how brands, agencies, and businesses connect with global audiences through WhiterChat.",
          "اكتشف كيف تتواصل العلامات التجارية والشركات مع الجماهير حول العالم عبر منصة WhiterChat."
        )}
        canonicalPath="/business"
      />

      <div className="max-w-5xl mx-auto space-y-12">
        {/* Business Hero Card */}
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-card to-muted/40 border border-border/80 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
          <div className="space-y-3 text-center md:text-left rtl:md:text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              {t("Commercial Partnerships", "الشراكات التجارية")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {t("Connect With An Engaged Creative Audience", "تواصل مع جمهور مبدع وشغوف")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg">
              {t(
                "Whether launching a new product line or building sustained community loyalty, WhiterChat provides the visual canvas to stand out.",
                "سواء كنت تطلق منتجًا جديدًا أو تسعى لبناء ولاء مستمر مع عملائك، توفر لك المنصة الأدوات البصرية للتميز."
              )}
            </p>
          </div>
          <Link href="/contact">
            <Button className="rounded-xl px-6 py-2.5 font-semibold gap-2 shadow-sm shrink-0">
              <Building2 className="w-4 h-4" />
              <span>{t("Partner With Us", "ابدأ الشراكة معنا")}</span>
            </Button>
          </Link>
        </div>

        {/* Pillars Grid */}
        <section className="grid sm:grid-cols-3 gap-6">
          {businessPillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="p-6 rounded-2xl bg-card border border-border/80 space-y-3">
                <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">{p.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </section>
      </div>
    </InstitutionalLayout>
  );
}
