import { useState } from "react";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { Shield, Lock, Eye, Clock, Database, Globe, UserCheck, Trash2, Mail, CheckCircle2, ChevronRight } from "lucide-react";

export default function PrivacyPolicyPage() {
  const { t, isRtl } = useI18n();
  const [activeSection, setActiveSection] = useState("intro");

  const lastUpdated = "March 15, 2026";
  const version = "v2.4";

  const sections = [
    { id: "intro", title: t("1. Introduction", "١. مقدمة عامة") },
    { id: "collection", title: t("2. Information We Collect", "٢. المعلومات التي نجمعها") },
    { id: "provided", title: t("3. Information You Provide Directly", "٣. معلومات تقدمها مباشرة") },
    { id: "automated", title: t("4. Automatically Collected Data", "٤. البيانات المجمعة تلقائيًا") },
    { id: "usage", title: t("5. How We Use Information", "٥. كيفية استخدام المعلومات") },
    { id: "sharing", title: t("6. How Information Is Shared", "٦. كيفية مشاركة المعلومات") },
    { id: "cookies", title: t("7. Cookies & Local Storage", "٧. الكوكيز والتخزين المحلي") },
    { id: "retention", title: t("8. Data Retention & Deletion", "٨. حفظ وحذف البيانات") },
    { id: "security", title: t("9. Data Security Measures", "٩. إجراءات حماية وأمن البيانات") },
    { id: "rights", title: t("10. Your Privacy Rights", "١٠. حقوق الخصوصية الخاصة بك") },
    { id: "minors", title: t("11. Minor & Teen Privacy", "١١. خصوصية المراهقين والقُصّر") },
    { id: "transfers", title: t("12. International Processing", "١٢. المعالجة الدولية للبيانات") },
    { id: "contact", title: t("13. Contact & Inquiries", "١٣. التواصل ومسؤول الخصوصية") },
  ];

  return (
    <InstitutionalLayout
      activeSection="privacy"
      pageTitle={t("Privacy Policy", "سياسة الخصوصية")}
      pageSubtitle={t(
        "We believe privacy is a fundamental human right. Learn how WhiterChat collects, protects, and gives you control over your personal data.",
        "نؤمن بأن الخصوصية حق إنساني أصيل. تعرف على كيفية جمع وحماية بياناتك والتحكم الكامل بها على WhiterChat."
      )}
    >
      <SEOHead
        title={t("Privacy Policy – WhiterChat Trust & Transparency", "سياسة الخصوصية – منصة WhiterChat")}
        description={t(
          "Read WhiterChat's comprehensive Privacy Policy covering data collection, encryption, account deletion, user privacy controls, and security standards.",
          "اقرأ سياسة الخصوصية الشاملة لمنصة WhiterChat ومعايير الأمان وحماية البيانات وحقوق المستخدمين."
        )}
        canonicalPath="/privacy"
      />

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sticky Sidebar Navigation */}
        <aside className="lg:col-span-4 sticky top-24 space-y-4">
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-border text-xs text-muted-foreground">
              <span>{t(`Version: ${version}`, `الإصدار: ${version}`)}</span>
              <span>{t(`Effective: ${lastUpdated}`, `تاريخ السريان: ${lastUpdated}`)}</span>
            </div>

            <nav className="space-y-1">
              {sections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={() => setActiveSection(sec.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeSection === sec.id
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{sec.title}</span>
                  <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180 opacity-60" />
                </a>
              ))}
            </nav>
          </div>

          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <Lock className="w-4 h-4" />
              <span>{t("Summary of Core Commitments", "ملخص التزاماتنا الأساسية")}</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>{t("No sale of personal information to data brokers.", "لا نبيع بياناتك الشخصية لأي أطراف ثالثة أو سماسرة بيانات.")}</li>
              <li>{t("One-click account and data purge anytime.", "إمكانية مسح الحساب وبياناته بنقرة واحدة في أي وقت.")}</li>
              <li>{t("Granular audience privacy per post, story, and note.", "تحكم دقيق في جمهور كل منشور وقصة وملاحظة.")}</li>
            </ul>
          </div>
        </aside>

        {/* Policy Body */}
        <div className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-6 sm:p-10 shadow-sm space-y-10 leading-relaxed text-sm text-foreground/90">
          {/* 1. Introduction */}
          <section id="intro" className="space-y-3 pt-2">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-2">
              <Shield className="w-5 h-5 text-primary" />
              {t("1. Introduction", "١. مقدمة عامة")}
            </h2>
            <p>
              {t(
                "Welcome to WhiterChat ('WhiterChat', 'we', 'our', or 'us'). We design our social discovery, multimedia sharing, stories, reels, and messaging platform with a commitment to user privacy, data minimization, and transparency. This Privacy Policy outlines the specific categories of personal information we process, the legal bases for doing so, how information is stored and protected, and the controls available to you.",
                "مرحبًا بك في منصة WhiterChat ('المنصة' أو 'نحن'). صممنا منصتنا لمشاركة الوسائط والقصص والريلز والمحادثات مع التزام راسخ بالحد الأدنى من البيانات والشفافية. توضح هذه السياسة فئات البيانات التي نعالجها والأساس القانوني لها وكيفية تخزينها والتحكم بها."
              )}
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section id="collection" className="space-y-3">
            <h2 className="text-xl font-bold text-foreground border-b border-border/60 pb-2">
              {t("2. Information We Collect", "٢. المعلومات التي نجمعها")}
            </h2>
            <p>
              {t(
                "We collect only the information necessary to provide, secure, and improve our services. We strictly do not scrape external private directories, read unassociated device telemetry, or log biometric identification data.",
                "نجمع فقط البيانات الضرورية لتشغيل وتأمين وتحسين خدماتنا. نحن لا نتتبع سجلات خارجية غير مرتبطة ولا نجمع بيانات التعرف البيومتري."
              )}
            </p>
          </section>

          {/* 3. Information You Provide */}
          <section id="provided" className="space-y-3">
            <h3 className="text-lg font-bold text-foreground">
              {t("3. Information You Provide Directly", "٣. معلومات تقدمها أنت مباشرة")}
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-1.5">
                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">{t("Account Data", "بيانات الحساب")}</h4>
                <p className="text-xs text-muted-foreground">
                  {t("Username, full display name, verified email address, hashed passwords, and optional bio/avatar.", "اسم المستخدم، الاسم الظاهر، البريد الإلكتروني المؤكد، كلمات المرور المشفرة بالـ Hash، والنبذة التعريفية.")}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-1.5">
                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">{t("User-Authored Content", "المحتوى المنشور")}</h4>
                <p className="text-xs text-muted-foreground">
                  {t("Photos, short-form video reels, stories, 24-hour temporary notes, comments, and direct chat messages.", "الصور، مقاطع الريلز، القصص اليومية، الملاحظات المؤقتة، التعليقات والرسائل المباشرة.")}
                </p>
              </div>
            </div>
          </section>

          {/* 4. Automated */}
          <section id="automated" className="space-y-3">
            <h3 className="text-lg font-bold text-foreground">
              {t("4. Automatically Collected Information", "٤. البيانات المجمعة تلقائيًا لأغراض التشغيل")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t(
                "When accessing the platform, standard web server logs record IP addresses (used strictly for rate limiting, DDoS defense, and session hijacking prevention), browser user-agent tokens, and general timezone preferences.",
                "عند زيارة المنصة، تسجل الخوادم عناوين IP لحماية الحساب من الاختراق وتفادي الهجمات ومنع البريد المزعج."
              )}
            </p>
          </section>

          {/* 5. How We Use Information */}
          <section id="usage" className="space-y-3">
            <h2 className="text-xl font-bold text-foreground border-b border-border/60 pb-2">
              {t("5. How We Use Information", "٥. كيفية استخدام المعلومات")}
            </h2>
            <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside">
              <li>{t("To authenticate your session and verify registration through 6-digit OTP email challenges.", "لمصادقة تسجيل الدخول وتأكيد الحسابات عبر رموز التحقق البريدية (OTP).")}</li>
              <li>{t("To rank your home feed and reels based on followed creators, freshness, and engagement signals.", "لترتيب المنشورات والريلز بناءً على الحسابات التي تتابعها وتفضيلاتك.")}</li>
              <li>{t("To protect our community against harassment, automated spam bots, and illegal material.", "لحماية المجتمع من الحسابات الوهمية والرسائل الاحتيالية.")}</li>
            </ul>
          </section>

          {/* 8. Retention & Deletion */}
          <section id="retention" className="space-y-3">
            <h2 className="text-xl font-bold text-foreground border-b border-border/60 pb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              {t("8. Data Retention & Account Purge", "٨. حفظ البيانات وحذف الحساب بالكامل")}
            </h2>
            <p>
              {t(
                "You have full ownership of your data. When you delete a post, story, note, or comment, it is purged immediately from active database indices. When you initiate an account deletion in Settings > Privacy, all personal identifiers, photos, videos, and private notes are permanently erased.",
                "لك الحق الكامل في بياناتك. عند حذف منشور أو قصة أو ملاحظة يتم إزالتها فورًا من قواعد البيانات. وعند طلب حذف الحساب بالكامل من الإعدادات، يتم مسح كافة البيانات المرتبطة نهائيًا."
              )}
            </p>
          </section>

          {/* 9. Data Security */}
          <section id="security" className="space-y-3">
            <h2 className="text-xl font-bold text-foreground border-b border-border/60 pb-2">
              {t("9. Data Security Measures", "٩. إجراءات حماية وأمن البيانات")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t(
                "All web traffic is transmitted via TLS/HTTPS. Passwords are cryptographically salted and hashed using bcrypt (cost factor 10). Session tokens use cryptographically signed JWTs with expiration controls.",
                "يتم تشفير كافة الاتصالات عبر بروتوكول HTTPS/TLS، وتُحفظ كلمات المرور باستخدام خوارزميات التشفير المتقدمة bcrypt، وتُدار الجلسات عبر رموز JWT المشفرة."
              )}
            </p>
          </section>

          {/* 13. Contact */}
          <section id="contact" className="space-y-3 pt-4 border-t border-border">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              {t("13. Privacy Officer & Inquiries", "١٣. مسؤول الخصوصية والتواصل")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t(
                "If you have questions regarding this Privacy Policy or wish to exercise your data subject rights, please reach out via our",
                "إذا كانت لديك أي استفسارات بخصوص سياسة الخصوصية أو ترغب في ممارسة حقوقك في بياناتك، تواصل معنا عبر"
              )}{" "}
              <a href="/contact" className="text-primary font-semibold underline underline-offset-2">
                {t("Contact Page", "صفحة التواصل الرسمية")}
              </a>{" "}
              {t("or email privacy@whiterchat.com.", "أو عبر البريد الإلكتروني privacy@whiterchat.com.")}
            </p>
          </section>
        </div>
      </div>
    </InstitutionalLayout>
  );
}
