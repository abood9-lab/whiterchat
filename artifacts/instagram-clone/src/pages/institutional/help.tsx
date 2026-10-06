import { useState } from "react";
import { Link } from "wouter";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { HelpCircle, Search, Compass, Shield, Lock, Video, MessageSquare, Sparkles, ChevronRight, Mail, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function HelpCenterPage() {
  const { t, isRtl } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", name: t("All Topics", "كافة المواضيع"), icon: Compass },
    { id: "account", name: t("Account & Login", "الحساب وتسجيل الدخول"), icon: Lock },
    { id: "reels", name: t("Reels & Posts", "الريلز والمنشورات"), icon: Video },
    { id: "messages", name: t("Direct Messages", "الرسائل الخاصة"), icon: MessageSquare },
    { id: "safety", name: t("Safety & Privacy", "الأمان والخصوصية"), icon: Shield },
    { id: "ai", name: t("AI Studio Features", "ميزات الذكاء الاصطناعي"), icon: Sparkles },
  ];

  const articles = [
    {
      id: "art-otp-login",
      category: "account",
      title: t("How to verify your account with Email OTP", "كيفية تفعيل الحساب برمز التحقق البريدي (OTP)"),
      excerpt: t(
        "Upon registration, a 6-digit numeric code is sent to your email. Enter it within 10 minutes to activate your profile.",
        "عند التسجيل، يُرسل رمز مكون من ٦ أرقام لبريدك الإلكتروني. أدخله خلال ١٠ دقائق لتفعيل الحساب."
      ),
      steps: [
        t("Sign up with your verified email address.", "أنشئ حسابك بالبريد الإلكتروني المؤكد."),
        t("Check your inbox (or spam folder) for the 6-digit code.", "افحص صندوق الوارد (أو مجلد الرسائل غير المرغوبة)."),
        t("Enter the code in the verification modal to complete registration.", "أدخل الرمز في شاشة التحقق لإتمام التفعيل."),
      ],
    },
    {
      id: "art-private-profile",
      category: "safety",
      title: t("Switching between Public and Private account", "التبديل بين الحساب العام والخاص"),
      excerpt: t(
        "A private account requires you to approve new follow requests before they can view your media or stories.",
        "الحساب الخاص يتطلب موافقتك على طلبات المتابعة الجديدة قبل أن يتمكنوا من رؤية منشوراتك وقصصك."
      ),
      steps: [
        t("Go to your Profile and tap Settings.", "انتقل إلى ملفك الشخصي وافتح الإعدادات."),
        t("Select Privacy & Security.", "اختر الخصوصية والأمان."),
        t("Toggle the Private Account switch to enabled.", "قم بتفعيل خيار 'حساب خاص'."),
      ],
    },
    {
      id: "art-reels-upload",
      category: "reels",
      title: t("Creating and publishing smooth video Reels", "إنشاء ونشر مقاطع الريلز السلسة"),
      excerpt: t(
        "Upload MP4 or WebM videos up to 90 seconds in 9:16 portrait format with background music and captions.",
        "ارفع فيديوهات MP4 أو WebM بدقة عمودية 9:16 مع إمكانية إضافة الموسيقى والوصف والوسوم."
      ),
      steps: [
        t("Click the + Create button in the sidebar or top bar.", "اضغط على زر الإنشاء (+) في الشريط الجانبي أو العلوي."),
        t("Select the Reels tab and drop your vertical video file.", "اختر تبويب 'ريلز' وأفلت ملف الفيديو العمودي."),
        t("Add captions, hashtags, and select music, then hit Share.", "أضف الوصف والوسوم واختر الموسيقى ثم اضغط مشاركة."),
      ],
    },
    {
      id: "art-ai-assistant",
      category: "ai",
      title: t("Using the AI Assistant for captions and creative ideas", "استخدام مساعد الذكاء الاصطناعي لكتابة الأوصاف والأفكار"),
      excerpt: t(
        "WhiterChat integrates smart assistants powered by Google Gemini to help generate engaging post descriptions and hashtags.",
        "توفر WhiterChat مساعدين أذكياء لتوليد أوصاف المنشورات والوسوم والأفكار الإبداعية."
      ),
      steps: [
        t("Open the AI Assistant tab from the main navigation.", "افتح تبويب المساعد الذكي من القائمة الرئيسية."),
        t("Choose a persona (e.g. Creative Writer, Social Strategist).", "اختر نمط المساعد (مثل الكاتب الإبداعي، أو خبير المحتوى)."),
        t("Ask questions or request caption variations for your next post.", "اطرح استفساراتك أو اطلب اقتراحات نصوص مميزة لمنشورك."),
      ],
    },
  ];

  const filtered = articles.filter((art) => {
    const matchesCategory = selectedCategory === "all" || art.category === selectedCategory;
    const matchesSearch =
      !searchTerm.trim() ||
      art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <InstitutionalLayout
      activeSection="help"
      pageTitle={t("Help Center & Knowledge Base", "مركز المساعدة وقاعدة المعرفة")}
      pageSubtitle={t(
        "Find guides, step-by-step answers, and troubleshooting support for all WhiterChat tools and features.",
        "دليلك الشامل للإجابات والحلول وشروحات الاستخدام لكافة ميزات وأدوات منصة WhiterChat."
      )}
    >
      <SEOHead
        title={t("Help Center & User Guides | WhiterChat", "مركز المساعدة والدعم | منصة WhiterChat")}
        description={t(
          "Get help with account verification, privacy settings, Reels creation, direct messages, and AI tools on WhiterChat.",
          "احصل على إجابات فورية وشروحات لكيفية تفعيل الحساب والخصوصية والريلز والرسائل في WhiterChat."
        )}
        canonicalPath="/help"
      />

      <div className="max-w-5xl mx-auto space-y-10">
        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto">
          <Search className="w-5 h-5 absolute left-3.5 rtl:right-3.5 rtl:left-auto top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("Search guides, features, troubleshooting...", "ابحث في الشروحات والميزات وحلول المشكلات...")}
            className="pl-11 rtl:pr-11 rtl:pl-4 h-12 rounded-2xl bg-card border-border shadow-sm text-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center justify-center flex-wrap gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <Button
                key={cat.id}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="rounded-xl text-xs gap-1.5 h-9"
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.name}</span>
              </Button>
            );
          })}
        </div>

        {/* Articles List */}
        <div className="grid md:grid-cols-2 gap-6">
          {filtered.map((art) => (
            <div
              key={art.id}
              className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3 flex flex-col justify-between hover:border-primary/40 transition-colors"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {art.category}
                </span>
                <h3 className="font-bold text-base text-foreground">{art.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{art.excerpt}</p>
              </div>

              <div className="pt-3 border-t border-border/50 space-y-1.5">
                <span className="text-[11px] font-semibold text-foreground">{t("Quick Steps:", "الخطوات السريعة:")}</span>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  {art.steps.map((st, i) => (
                    <li key={i}>{st}</li>
                  ))}
                </ol>
              </div>
            </div>
          ))}
        </div>

        {/* Still Need Help Contact Box */}
        <div className="p-8 rounded-3xl bg-muted/40 border border-border flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left rtl:sm:text-right">
            <h3 className="text-lg font-bold text-foreground">
              {t("Can't find what you are looking for?", "لم تجد ما تبحث عنه؟")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("Our support agents are here to assist you with account issues and questions.", "فريق الدعم الفني جاهز لمساعدتك في أي استفسار أو مشكلة تقنية.")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/contact">
              <Button className="rounded-xl text-xs font-semibold px-4 gap-2">
                <Mail className="w-3.5 h-3.5" />
                <span>{t("Contact Support", "تواصل مع الدعم")}</span>
              </Button>
            </Link>
            <Link href="/report-problem">
              <Button variant="outline" className="rounded-xl text-xs px-4">
                <span>{t("Report a Bug", "الإبلاغ عن خلل")}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </InstitutionalLayout>
  );
}
