import { useState } from "react";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { HeartHandshake, ShieldCheck, AlertTriangle, Flag, Ban, CheckCircle2, UserX, EyeOff, ShieldAlert } from "lucide-react";

export default function CommunityGuidelinesPage() {
  const { t, isRtl } = useI18n();

  const rules = [
    {
      title: t("Authentic Self-Expression & Respect", "التعبير الأصيل والاحترام المتبادل"),
      desc: t(
        "Treat others with dignity. Harassment, targeted bullying, discriminatory hate speech based on race, religion, gender, or nationality is strictly prohibited.",
        "عامل الآخرين باحترام. يُحظر تمامًا التحرش، التنمر، أو خطاب الكراهية والتمييز على أساس العرق أو الدين أو الجنس أو الجنسية."
      ),
      icon: HeartHandshake,
      color: "text-emerald-500",
    },
    {
      title: t("Safety & Physical Well-being", "السلامة والأمان الجسدي"),
      desc: t(
        "Never post content that promotes self-harm, suicide, physical violence, dangerous challenges, or illegal activities.",
        "يُمنع نشر أي محتوى يروج لإيذاء النفس أو الانتحار أو العنف الجسدي أو الأنشطة غير القانونية."
      ),
      icon: ShieldCheck,
      color: "text-blue-500",
    },
    {
      title: t("Nudity & Adult Content Restrictions", "قيود العري والمحتوى الإباحي"),
      desc: t(
        "Sexually explicit media, pornography, and non-consensual sharing of intimate images are forbidden and result in immediate account termination.",
        "المواد الإباحية والمحتوى الجنسي الصريح محظور تمامًا ويؤدي للإيقاف الفوري للحساب."
      ),
      icon: EyeOff,
      color: "text-purple-500",
    },
    {
      title: t("Spam, Scams & Fake Engagement", "منع الاحتيال والبريد المزعج"),
      desc: t(
        "Do not deploy automated follow/like bots, run crypto scams, post deceptive phishing links, or artificially manipulate trending feeds.",
        "لا تستخدم روبوتات المتابعة التلقائية أو روابط التصيد الاحتيالي أو التلاعب المصطنع بالتفاعل."
      ),
      icon: Ban,
      color: "text-amber-500",
    },
    {
      title: t("Intellectual Property & Copyright", "احترام حقوق الملكية الفكرية"),
      desc: t(
        "Only upload photos, audio tracks, and video clips that you created or have explicit rights to share.",
        "انشر فقط الصور والمقاطع الموسيقية والفيديوهات التي تمتلك حقوق نشرها أو قمت بإنشائها بنفسك."
      ),
      icon: ShieldAlert,
      color: "text-indigo-500",
    },
    {
      title: t("Privacy & Impersonation", "حماية الخصوصية ومنع الانتحال"),
      desc: t(
        "Do not post private personal data (doxxing), financial numbers, or pretend to be another person or official brand.",
        "يُحظر نشر البيانات الشخصية للآخرين (Doxxing) أو انتحال شخصية أفراد أو جهات رسمية."
      ),
      icon: UserX,
      color: "text-rose-500",
    },
  ];

  const enforcementTiers = [
    {
      tier: t("1. Educational Warning", "١. تنبيه توعوي"),
      desc: t("Issued for minor or first-time accidental policy infractions with guidance on guidelines.", "يُرسل في المخالفات البسيطة غير المقصودة مع توضيح الإرشادات للمستخدم."),
    },
    {
      tier: t("2. Content Removal", "٢. إزالة وحذف المحتوى"),
      desc: t("The violating post, story, reel, or comment is permanently erased from public feeds.", "يتم حذف المنشور أو القصة أو التعليق المخالف نهائيًا من المنصة."),
    },
    {
      tier: t("3. Temporary Feature Restriction", "٣. تقييد ميزات مؤقت"),
      desc: t("Temporary block on commenting, direct messaging, or posting for 24 hours to 7 days.", "حظر مؤقت للتعليقات أو الرسائل الخاصة أو النشر لمدة تتراوح بين يوم و٧ أيام."),
    },
    {
      tier: t("4. Account Suspension or Termination", "٤. تعليق الحساب أو الإغلاق الدائم"),
      desc: t("Complete deactivation for severe, dangerous, or repeated community violations.", "إغلاق دائم وشامل للحساب في المخالفات الخطيرة أو المتكررة."),
    },
  ];

  return (
    <InstitutionalLayout
      activeSection="guidelines"
      pageTitle={t("Community Guidelines", "إرشادات المجتمع")}
      pageSubtitle={t(
        "Our rules exist to ensure WhiterChat remains a creative, inspiring, and safe space for every creator and user worldwide.",
        "وُضعت هذه الإرشادات لضمان بقاء WhiterChat مساحة ملهمة وآمنة ومرحبة بجميع صناع المحتوى والمستخدمين."
      )}
    >
      <SEOHead
        title={t("Community Guidelines – Safety, Respect & Authenticity | WhiterChat", "إرشادات المجتمع – الأمان والاحترام | منصة WhiterChat")}
        description={t(
          "Learn about WhiterChat's community standards against harassment, spam, hate speech, and explicit content, and our enforcement process.",
          "تعرف على معايير وقواعد مجتمع WhiterChat لمنع التنمر والاحتيال والكراهية وإجراءات التحقيق والعقوبات."
        )}
        canonicalPath="/community-guidelines"
      />

      <div className="max-w-5xl mx-auto space-y-12">
        {/* Core Principles Grid */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {t("Our Core Community Standards", "معايير المجتمع الأساسية")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              {t(
                "Every post, story, comment, and reel is held to these standards across the entire platform.",
                "تنطبق هذه المعايير على كل منشور وقصة وتعليق ومقطع ريلز في جميع أنحاء المنصة."
              )}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {rules.map((rule, idx) => {
              const Icon = rule.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-card border border-border/70 shadow-sm space-y-2.5 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-muted/60 shrink-0">
                      <Icon className={`w-5 h-5 ${rule.color}`} />
                    </div>
                    <h3 className="font-bold text-base text-foreground">{rule.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rule.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* How Reporting Works */}
        <section className="p-8 rounded-2xl bg-gradient-to-br from-card to-muted/40 border border-border/80 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Flag className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {t("How Reporting & Investigations Work", "كيفية عمل نظام البلاغات والتحقيق")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("We review community reports 24/7 with human moderation oversight.", "يتم فحص البلاغات على مدار الساعة بواسطة فريق الإشراف المباشر.")}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-background border border-border/60 space-y-2">
              <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">1</span>
                {t("Submit Report", "إرسال البلاغ")}
              </span>
              <p className="text-muted-foreground">
                {t("Tap the three dots on any post, reel, or profile to report a violation.", "اضغط على خيارات أي منشور أو حساب لاختيار سبب المخالفة.")}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border/60 space-y-2">
              <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">2</span>
                {t("Triage & Review", "الفحص والتقييم")}
              </span>
              <p className="text-muted-foreground">
                {t("Our trust & safety team reviews contextual evidence against these guidelines.", "يقوم الفريق بمراجعة الأدلة وسياق المحتوى وفقًا للمعايير.")}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border/60 space-y-2">
              <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">3</span>
                {t("Action & Outcome", "اتخاذ الإجراء")}
              </span>
              <p className="text-muted-foreground">
                {t("Enforcement action is applied and the reporter is notified of the resolution.", "يتم تطبيق العقوبة المناسبة وإشعار صاحب البلاغ بنتيجة الإجراء.")}
              </p>
            </div>
          </div>
        </section>

        {/* Enforcement Tiers */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            {t("Enforcement Tiers & Penalties", "درجات العقوبات وتطبيق السياسات")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {enforcementTiers.map((tier, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-card border border-border/60 space-y-1">
                <h4 className="font-semibold text-sm text-foreground">{tier.tier}</h4>
                <p className="text-xs text-muted-foreground">{tier.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </InstitutionalLayout>
  );
}
