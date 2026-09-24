import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { Newspaper, Download, Mail, Image, Palette, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PressKitPage() {
  const { t, isRtl } = useI18n();

  const brandColors = [
    { name: "Primary Indigo", hex: "#6366f1", bg: "bg-indigo-500" },
    { name: "Accent Pink", hex: "#ec4899", bg: "bg-pink-500" },
    { name: "Vibrant Purple", hex: "#9333ea", bg: "bg-purple-600" },
    { name: "Neutral Dark", hex: "#0f172a", bg: "bg-slate-900" },
  ];

  const pressReleases = [
    {
      date: "March 12, 2026",
      title: t(
        "WhiterChat Rolls Out Low-Latency Reels Engine with Adaptive Streaming",
        "منصة WhiterChat تطلق محرك الريلز فائق السرعة مع البث التكيفي الذكي"
      ),
      summary: t(
        "Enhanced video pipelines provide instantaneous playback, smoother transitions, and reduced bandwidth usage worldwide.",
        "تحديث شامل لمعالجة الفيديوهات يتيح تشغيلًا فوريًا وانتقالات أكثر سلاسة واستهلاكًا أقل للبيانات."
      ),
    },
    {
      date: "February 24, 2026",
      title: t(
        "Integration of Multimodal AI Assistants for Creator Caption Crafting",
        "دمج المساعدين الأذكياء لمساعدة صناع المحتوى في كتابة الأوصاف والوسوم"
      ),
      summary: t(
        "Empowering creators with privacy-conscious smart assistant tools powered by Google Gemini.",
        "تمكين المبدعين بأدوات ذكاء اصطناعي تحترم الخصوصية لتوليد أفكار المحتوى وتحسين التفاعل."
      ),
    },
  ];

  return (
    <InstitutionalLayout
      activeSection="press"
      pageTitle={t("Press & Brand Kit", "الصحافة والهوية الإعلامية")}
      pageSubtitle={t(
        "Official brand guidelines, logos, media assets, and press contact information for journalists and partners.",
        "الأصول الإعلامية الرسمية وشعارات المنصة ودليل الهوية البصرية ومعلومات التواصل للصحفيين والشركاء."
      )}
    >
      <SEOHead
        title={t("Press & Media Kit | WhiterChat Official Assets", "الصحافة والهوية الإعلامية | أصول WhiterChat الرسمية")}
        description={t(
          "Download official WhiterChat logos, brand color palettes, press releases, and media inquiries contact details.",
          "حمّل شعارات WhiterChat الرسمية ودليل الألوان والبيانات الصحفية واستفسارات الإعلام."
        )}
        canonicalPath="/press"
      />

      <div className="max-w-5xl mx-auto space-y-12">
        {/* Media Inquiries Card */}
        <div className="p-8 rounded-3xl bg-card border border-border/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left rtl:md:text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {t("Media Relations", "العلاقات الإعلامية")}
            </span>
            <h2 className="text-xl font-bold text-foreground">
              {t("Journalist & Press Contact", "تواصل الصحفيين والإعلام")}
            </h2>
            <p className="text-xs text-muted-foreground max-w-md">
              {t(
                "For interview requests, product announcements, and editorial inquiries, reach our media team directly at press@whiterchat.com.",
                "لطلبات المقابلات الصحفية وتغطية التحديثات والاستفسارات التحريرية، تواصل مباشرة مع فريقنا الإعلامي عبر press@whiterchat.com."
              )}
            </p>
          </div>
          <a href="mailto:press@whiterchat.com">
            <Button className="rounded-xl px-5 gap-2 font-semibold shrink-0">
              <Mail className="w-4 h-4" />
              <span>press@whiterchat.com</span>
            </Button>
          </a>
        </div>

        {/* Brand Assets & Colors */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <span>{t("Official Brand Colors", "الألوان الرسمية للهوية")}</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("Our gradient palette combines dynamic energy with calm readability.", "تجمع لوحة الألوان بين الحيوية البصرية والوضوح البصري المريح.")}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {brandColors.map((color, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
                <div className={`w-full h-16 rounded-xl ${color.bg} shadow-inner`} />
                <div>
                  <h4 className="font-bold text-xs text-foreground">{color.name}</h4>
                  <span className="font-mono text-[11px] text-muted-foreground">{color.hex}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Brand Logo Display */}
        <section className="p-8 rounded-3xl bg-muted/30 border border-border space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left rtl:sm:text-right">
              <h3 className="text-lg font-bold text-foreground">{t("Brand Mark & Typography", "رمز وشعار المنصة")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("Maintain generous padding around the logo mark. Do not alter aspect ratios or colors.", "يُرجى الحفاظ على مسافة أمان حول الشعار وعدم تشويه الأبعاد أو تغيير الألوان.")}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-background rounded-[14px] flex items-center justify-center">
                  <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 text-xl">
                    W
                  </span>
                </div>
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-foreground">WhiterChat</span>
            </div>
          </div>
        </section>

        {/* Latest Press Announcements */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-primary" />
            <span>{t("Recent Announcements", "أحدث البيانات الصحفية")}</span>
          </h3>

          <div className="space-y-4">
            {pressReleases.map((item, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-card border border-border/80 space-y-2">
                <span className="text-[11px] font-semibold text-primary">{item.date}</span>
                <h4 className="font-bold text-base text-foreground">{item.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </InstitutionalLayout>
  );
}
