import { Link } from "wouter";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { Shield, Lock, EyeOff, UserX, MessageSquare, AlertTriangle, Key, ExternalLink, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SafetyCenterPage() {
  const { t, isRtl } = useI18n();

  const safetyFeatures = [
    {
      title: t("Granular Privacy Controls", "إعدادات الخصوصية المتقدمة"),
      desc: t(
        "Make your account Private so only approved followers see your posts, reels, and stories.",
        "اجعل حسابك خاصًا (Private) لتتمكن فقط الحسابات المعتمدة من رؤية منشوراتك وقصصك."
      ),
      actionText: t("Privacy Settings", "إعدادات الخصوصية"),
      link: "/settings",
      icon: Lock,
    },
    {
      title: t("Block & Mute Accounts", "حظر وكتم الحسابات المزعجة"),
      desc: t(
        "Instantly block accounts from viewing your profile, sending messages, or commenting on your media.",
        "احظر أي حساب لمنعه فورًا من الوصول لملفك الشخصي أو إرسال الرسائل والتعليقات."
      ),
      actionText: t("Blocked Accounts", "قائمة المحظورين"),
      link: "/settings",
      icon: UserX,
    },
    {
      title: t("Two-Factor Authentication (2FA)", "المصادقة الثنائية وتأمين الدخول"),
      desc: t(
        "Protect your account against credential theft with mandatory email verification challenges and session tokens.",
        "أمّن حسابك ضد الاختراق عبر تأكيد تسجيل الدخول من خلال رموز OTP المشفرة."
      ),
      actionText: t("Security Center", "مركز الأمان"),
      link: "/security",
      icon: Key,
    },
    {
      title: t("Direct Message Safety", "أمان الرسائل المباشرة"),
      desc: t(
        "Messages from non-followers go directly to Message Requests, giving you control before accepting chats.",
        "تنتقل رسائل غير المتابعين إلى صندوق طلبات الرسائل للمعاينة قبل الموافقة."
      ),
      actionText: t("Message Settings", "إعدادات الرسائل"),
      link: "/messages",
      icon: MessageSquare,
    },
  ];

  return (
    <InstitutionalLayout
      activeSection="safety"
      pageTitle={t("Safety Center", "مركز الأمان والحماية")}
      pageSubtitle={t(
        "Your safety, mental well-being, and digital privacy are our highest priorities. Explore tools and practices to stay protected.",
        "أمانك وراحتك الرقمية وخصوصيتك هي أولويتنا القصوى. اكتشف الأدوات والإرشادات لحماية حسابك وتجربتك."
      )}
    >
      <SEOHead
        title={t("Safety Center – Protect Your Account & Privacy | WhiterChat", "مركز الأمان – حماية الحساب والخصوصية | منصة WhiterChat")}
        description={t(
          "Discover WhiterChat safety features including private accounts, blocking, muting, scam awareness, two-factor authentication, and reporting tools.",
          "تعرف على أدوات أمان WhiterChat: الحسابات الخاصة، الحظر، الكتم، الوقاية من الاحتيال، والمصادقة الثنائية."
        )}
        canonicalPath="/safety"
      />

      <div className="max-w-5xl mx-auto space-y-12">
        {/* Quick Actions Hero Card */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2 text-center md:text-left rtl:md:text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/20 px-2.5 py-1 rounded-full">
              {t("Direct Controls", "أدوات تحكم مباشرة")}
            </span>
            <h2 className="text-2xl font-bold text-foreground">
              {t("Take Control of Your WhiterChat Experience", "تحكم بالكامل في خصوصية حسابك")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg">
              {t(
                "Access your security settings, manage who can message you, and review active sessions anytime.",
                "يمكنك إدارة إعدادات الأمان ومراجعة الجلسات النشطة والتحكم في من يتواصل معك بسهولة."
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/settings">
              <Button className="rounded-xl px-5 gap-2 font-semibold">
                <span>{t("Open Settings", "فتح الإعدادات")}</span>
                {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </Button>
            </Link>
            <Link href="/report-problem">
              <Button variant="outline" className="rounded-xl px-4 gap-2 border-border">
                <span>{t("Report Abuse", "الإبلاغ عن إساءة")}</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="grid md:grid-cols-2 gap-6">
          {safetyFeatures.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between gap-4 hover:border-primary/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground">{feat.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
                </div>
                <Link href={feat.link}>
                  <Button variant="ghost" size="sm" className="w-fit p-0 h-auto text-xs text-primary font-semibold hover:underline gap-1">
                    <span>{feat.actionText}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            );
          })}
        </section>

        {/* Scam & Phishing Awareness Tips */}
        <section className="p-6 sm:p-8 rounded-2xl bg-card border border-border/80 space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <h3 className="text-lg font-bold text-foreground">
              {t("Scam & Phishing Prevention Guide", "دليل الوقاية من الاحتيال والتصيد الإلكتروني")}
            </h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-xs text-muted-foreground">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-1">
              <strong className="text-foreground block">{t("We Never Ask For Passwords", "لن نطلب كلمة مرورك أبدًا")}</strong>
              <p>{t("WhiterChat staff will never ask for your password, verification OTP, or payment details in DMs.", "لن يطلب منك موظفو المنصة كلمة المرور أو رمز التحقق في الرسائل الخاصة مطلقًا.")}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-1">
              <strong className="text-foreground block">{t("Verify Official Links", "تحقق من الروابط الرسمية")}</strong>
              <p>{t("Always ensure you are visiting our verified web domain before submitting account credentials.", "تأكد دائمًا من نطاق الموقع الرسمي قبل إدخال أي بيانات تسجيل دخول.")}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-1">
              <strong className="text-foreground block">{t("Report Suspicious Messages", "أبلغ عن الرسائل المشبوهة")}</strong>
              <p>{t("If you receive unsolicited cryptocurrency offers or fake giveaways, report the account immediately.", "إذا تلقيت عروضًا احتيالية أو روابط وهمية، قم بالإبلاغ عن الحساب مباشرة.")}</p>
            </div>
          </div>
        </section>
      </div>
    </InstitutionalLayout>
  );
}
