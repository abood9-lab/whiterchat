import { Link } from "wouter";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { Megaphone, ShieldCheck, Eye, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdvertisingPage() {
  const { t, isRtl } = useI18n();

  const adStandards = [
    {
      title: t("Clear Sponsored Disclosures", "الإفصاح الواضح عن المحتوى الإعلاني"),
      desc: t(
        "All commercial collaborations and paid creator sponsorships must clearly include #ad or #sponsored disclosures.",
        "يجب أن تتضمن كافة الشراكات التجارية والإعلانات المدفوعة وسم #إعلان أو #برعاية بشكل صريح."
      ),
      icon: Eye,
    },
    {
      title: t("Prohibited Ad Categories", "الفئات والمنتجات المحظورة إعلانيًا"),
      desc: t(
        "We strictly prohibit ads for deceptive financial schemes, unverified medical claims, illegal substances, and predatory loans.",
        "يُحظر الإعلان عن المخططات المالية الاحتيالية، أو الادعاءات الطبية المضللة، أو المنتجات غير القانونية."
      ),
      icon: ShieldCheck,
    },
    {
      title: t("Non-Intrusive Formats", "صيغ إعلانية غير مزعجة للمستخدم"),
      desc: t(
        "Ad experiences are designed to integrate organically without popups, autoplay sound, or disruptive overlays.",
        "صُممت الإعلانات لتندمج بسلاسة دون نوافذ منبثقة مزعجة أو تشغيل تلقائي للصوت يضر بتجربة المستخدم."
      ),
      icon: Sparkles,
    },
  ];

  return (
    <InstitutionalLayout
      activeSection="advertising"
      pageTitle={t("Advertising Standards & Guidelines", "معايير وسياسات الإعلانات")}
      pageSubtitle={t(
        "Guidelines ensuring high-quality, transparent, and respectful commercial experiences across WhiterChat.",
        "المعايير المحددة لضمان تجارب إعلانية شفافة وعالية الجودة تحترم خصوصية وراحة مجتمع WhiterChat."
      )}
    >
      <SEOHead
        title={t("Advertising Standards & Policies | WhiterChat", "معايير وسياسات الإعلانات | WhiterChat")}
        description={t(
          "Review WhiterChat advertising guidelines, sponsored disclosure requirements, and commercial compliance policies.",
          "اطلع على سياسات الإعلانات في WhiterChat، ومتطلبات الإفصاح عن الرعاية، وضوابط حماية المستهلك."
        )}
        canonicalPath="/advertising"
      />

      <div className="max-w-4xl mx-auto space-y-10">
        <section className="grid sm:grid-cols-3 gap-6">
          {adStandards.map((st, i) => {
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

        <section className="p-6 rounded-2xl bg-muted/30 border border-border text-xs text-muted-foreground space-y-2">
          <strong className="text-foreground text-sm block">{t("Inquiries & Compliance", "الاستفسارات والامتثال الإعلاني")}</strong>
          <p>
            {t(
              "For inquiries regarding ad compliance, brand safety certifications, or managed campaigns, contact ads@whiterchat.com.",
              "للاستفسارات المتعلقة بالامتثال الإعلاني ومعايير أمان العلامات التجارية، راسلنا عبر ads@whiterchat.com."
            )}
          </p>
        </section>
      </div>
    </InstitutionalLayout>
  );
}
