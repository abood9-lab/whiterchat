import { Link } from "wouter";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { Sparkles, Video, TrendingUp, Users, Award, PlayCircle, Layers, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreatorResourcesPage() {
  const { t, isRtl } = useI18n();

  const creatorGuides = [
    {
      title: t("Mastering Short-Form Reels", "احتراف صناعة مقاطع الريلز"),
      desc: t(
        "Learn optimal 9:16 framing, lighting techniques, quick 3-second hooks, and music synchronization.",
        "تعلم أسرار التصوير العمودي 9:16، والإضاءة، وجذب الانتباه في أول ٣ ثوانٍ، وتناغم الصوت."
      ),
      icon: Video,
    },
    {
      title: t("AI Studio Creative Workflows", "أدوات الذكاء الاصطناعي للمبدعين"),
      desc: t(
        "Leverage Google Gemini assistance to draft captivating captions, brainstorm storylines, and discover trending hashtags.",
        "استفد من المساعد الذكي لتوليد أفكار المحتوى، وصياغة الأوصاف المؤثرة، واقتراح أنسب الوسوم."
      ),
      icon: Sparkles,
    },
    {
      title: t("Audience Engagement & Community", "بناء الجمهور والتفاعل المباشر"),
      desc: t(
        "Use interactive polls, 24-hour daily notes, and story highlights to keep your followers engaged.",
        "استخدم استطلاعات الرأي التفاعلية، والملاحظات اليومية، وأبرز القصص لتعزيز ارتباط المتابعين بك."
      ),
      icon: Users,
    },
    {
      title: t("Feed Ranking & Discovery Insights", "فهم خوارزميات الترتيب والاستكشاف"),
      desc: t(
        "Understand freshness signals, completion rates, and diversity ranking metrics on the Explore tab.",
        "تعرف على مؤشرات سرعة التفاعل، ونسب المشاهدة الكاملة، ومعايير الظهور في صفحة الاستكشاف."
      ),
      icon: TrendingUp,
    },
  ];

  return (
    <InstitutionalLayout
      activeSection="creators"
      pageTitle={t("Creator Resources & Academy", "أكاديمية ودليل صناع المحتوى")}
      pageSubtitle={t(
        "Everything you need to grow your audience, produce high-impact reels, and express your creative voice on WhiterChat.",
        "دليلك الشامل لزيادة متابعيك، وإنتاج ريلز بجودة احترافية، والتعبير عن إبداعك بأحدث الأدوات."
      )}
    >
      <SEOHead
        title={t("Creator Resources & Production Guides | WhiterChat", "دليل صناع المحتوى والإنتاج | منصة WhiterChat")}
        description={t(
          "Master video Reels, creative AI workflows, audience engagement tips, and feed ranking strategies on WhiterChat.",
          "تعلم أسرار إنتاج الريلز وأدوات الذكاء الاصطناعي والتفاعل واستراتيجيات الانتشار في WhiterChat."
        )}
        canonicalPath="/creators"
      />

      <div className="max-w-5xl mx-auto space-y-12">
        {/* Creator Hero Card */}
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-purple-600/10 via-pink-500/10 to-amber-400/10 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
          <div className="space-y-3 text-center md:text-left rtl:md:text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/20 px-3 py-1 rounded-full">
              {t("Creator Hub", "منصة المبدعين")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {t("Turn Your Passion Into Influence", "حوّل شغفك إلى تأثير وإبداع")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg">
              {t(
                "WhiterChat is built to champion original creators. Explore best practices and creative tools engineered for high-engagement storytelling.",
                "صُممت المنصة لدعم المبدعين الأصليين. اكتشف أفضل الممارسات والأدوات التقنية المصممة لرواية القصص الملهمة."
              )}
            </p>
          </div>
          <Link href="/reels">
            <Button className="rounded-xl px-6 py-2.5 font-semibold gap-2 shadow-md shrink-0">
              <PlayCircle className="w-5 h-5" />
              <span>{t("Explore Trending Reels", "استكشف الريلز الرائجة")}</span>
            </Button>
          </Link>
        </div>

        {/* Guides Grid */}
        <section className="grid sm:grid-cols-2 gap-6">
          {creatorGuides.map((guide, idx) => {
            const Icon = guide.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3 hover:border-primary/40 transition-colors"
              >
                <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-foreground">{guide.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{guide.desc}</p>
              </div>
            );
          })}
        </section>

        {/* Video Technical Specs Card */}
        <section className="p-6 sm:p-8 rounded-2xl bg-muted/30 border border-border space-y-4">
          <h3 className="text-lg font-bold text-foreground">
            {t("Recommended Technical Specifications", "المواصفات الفنية المثالية للفيديو")}
          </h3>
          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-card border border-border/60 space-y-1">
              <strong className="text-foreground block">{t("Format & Container", "الصيغة والترميز")}</strong>
              <span className="text-muted-foreground">MP4 (H.264) or WebM with AAC audio</span>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border/60 space-y-1">
              <strong className="text-foreground block">{t("Resolution & Ratio", "الدقة ونسبة العرض")}</strong>
              <span className="text-muted-foreground">1080 × 1920 (9:16 Vertical Full Screen)</span>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border/60 space-y-1">
              <strong className="text-foreground block">{t("Frame Rate & Duration", "معدل الإطارات والمدة")}</strong>
              <span className="text-muted-foreground">30fps / 60fps • Up to 90 Seconds</span>
            </div>
          </div>
        </section>
      </div>
    </InstitutionalLayout>
  );
}
