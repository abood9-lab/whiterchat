import { useState } from "react";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { FileText, ShieldAlert, Scale, CheckCircle2, ChevronRight, UserCheck, AlertOctagon } from "lucide-react";

export default function TermsOfServicePage() {
  const { t, isRtl } = useI18n();
  const [activeSection, setActiveSection] = useState("acceptance");

  const lastUpdated = "March 15, 2026";
  const version = "v2.2";

  const sections = [
    { id: "acceptance", title: t("1. Acceptance of Terms", "١. الموافقة على الشروط") },
    { id: "eligibility", title: t("2. Eligibility & Age Requirements", "٢. الأهلية ومتطلبات العمر") },
    { id: "accounts", title: t("3. Account Security & Verification", "٣. أمن الحساب والتحقق") },
    { id: "content", title: t("4. User Content & Ownership", "٤. ملكية المحتوى المنشور") },
    { id: "license", title: t("5. License Granted to Platform", "٥. الترخيص الممنوح للمنصة") },
    { id: "conduct", title: t("6. Acceptable Use & Prohibitions", "٦. الاستخدام المقبول والمحظورات") },
    { id: "features", title: t("7. Reels, Stories, Notes & AI Rules", "٧. قواعد الريلز والقصص والملاحظات والذكاء الاصطناعي") },
    { id: "moderation", title: t("8. Moderation & Account Suspension", "٨. الإشراف وتعليق الحسابات") },
    { id: "ip", title: t("9. Intellectual Property & Copyright", "٩. الملكية الفكرية وحقوق النشر") },
    { id: "disclaimers", title: t("10. Disclaimers & Limitation of Liability", "١٠. إخلاء المسؤولية وحدودها") },
    { id: "termination", title: t("11. Termination & Account Deletion", "١١. إنهاء الخدمة وحذف الحساب") },
    { id: "changes", title: t("12. Amendments to Terms", "١٢. تعديل وتحديث الشروط") },
  ];

  return (
    <InstitutionalLayout
      activeSection="terms"
      pageTitle={t("Terms of Service", "شروط الاستخدام")}
      pageSubtitle={t(
        "Please read these terms carefully before accessing or using WhiterChat. By creating an account or browsing public content, you agree to be bound by these terms.",
        "يرجى قراءة هذه الشروط بعناية قبل استخدام منصة WhiterChat. بإنشاء حساب أو تصفح المحتوى العام، فإنك توافق على الالتزام بهذه الشروط."
      )}
    >
      <SEOHead
        title={t("Terms of Service – WhiterChat Legal Standards", "شروط الاستخدام – منصة WhiterChat")}
        description={t(
          "Review the official Terms of Service governing account registration, content ownership, acceptable conduct, moderation, and user safety on WhiterChat.",
          "اطلع على شروط استخدام منصة WhiterChat الرسمية المنظمة لتسجيل الحسابات وملكية المحتوى وقواعد النشر وإشراف المجتمع."
        )}
        canonicalPath="/terms"
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

          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Scale className="w-4 h-4 text-primary" />
              <span>{t("Plain English Summary", "ملخص بلغة مبسطة")}</span>
            </div>
            <p>
              {t(
                "You own everything you create. You grant us permission to host and display your content according to your privacy settings. Do not post illegal, hateful, or harmful content.",
                "أنت تملك كل محتوى تنشئه بالكامل. تمنحنا الترخيص الفني لعرضه وحفظه وفقًا لإعدادات الخصوصية التي تحددها. يحظر نشر أي محتوى مسيء أو غير قانوني."
              )}
            </p>
          </div>
        </aside>

        {/* Terms Body */}
        <div className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-6 sm:p-10 shadow-sm space-y-10 leading-relaxed text-sm text-foreground/90">
          {/* 1. Acceptance */}
          <section id="acceptance" className="space-y-3">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-2">
              <FileText className="w-5 h-5 text-primary" />
              {t("1. Acceptance of Terms", "١. الموافقة على الشروط")}
            </h2>
            <p>
              {t(
                "These Terms of Service ('Terms') constitute a legally binding agreement between you ('User', 'you') and WhiterChat Inc. ('WhiterChat', 'we', 'us'). By accessing, registering, downloading, or using any feature of our web application, you acknowledge that you have read, understood, and agreed to be bound by these Terms and our Privacy Policy.",
                "تشكل هذه الشروط اتفاقية قانونية ملزمة بينك وبين منصة WhiterChat. باستخدامك للموقع أو تسجيل حساب، فإنك تقر بقراءتك وموافقتك الكاملة على هذه الشروط وسياسة الخصوصية."
              )}
            </p>
          </section>

          {/* 2. Eligibility */}
          <section id="eligibility" className="space-y-3">
            <h2 className="text-xl font-bold text-foreground border-b border-border/60 pb-2">
              {t("2. Eligibility & Age Requirements", "٢. الأهلية ومتطلبات العمر")}
            </h2>
            <p>
              {t(
                "You must be at least 13 years old (or the minimum legal age required in your country) to create an account on WhiterChat. If you are under the legal age of majority, you must have the consent of a parent or legal guardian.",
                "يجب ألا يقل عمرك عن 13 عامًا (أو السن القانوني المحدد في دولتك) لإنشاء حساب. إذا كنت قاصرًا، يلزم الحصول على موافقة ولي الأمر."
              )}
            </p>
          </section>

          {/* 3. Account Security */}
          <section id="accounts" className="space-y-3">
            <h2 className="text-xl font-bold text-foreground border-b border-border/60 pb-2">
              {t("3. Account Security & Verification", "٣. أمن الحساب والتحقق")}
            </h2>
            <p>
              {t(
                "You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. You agree to provide a valid, verifiable email address during sign-up to complete the mandatory OTP email challenge. Notify us immediately if you suspect unauthorized access.",
                "أنت مسؤول عن الحفاظ على سرية بيانات تسجيل دخولك وكافة الأنشطة التي تتم عبر حسابك. يلزم تقديم بريد إلكتروني صالح لتأكيد رمز التحقق (OTP). أبلغنا فورًا عند الاشتباه في أي اختراق."
              )}
            </p>
          </section>

          {/* 4. Content Ownership */}
          <section id="content" className="space-y-3">
            <h2 className="text-xl font-bold text-foreground border-b border-border/60 pb-2">
              {t("4. User Content & Ownership", "٤. ملكية المحتوى المنشور")}
            </h2>
            <p>
              {t(
                "You retain all intellectual property rights and full ownership of any photos, video reels, stories, notes, comments, and profile materials ('User Content') that you submit or publish on WhiterChat.",
                "أنت المالك الحصري لكافة حقوق الملكية الفكرية لأي صور، مقاطع ريلز، قصص، ملاحظات، أو تعليقات تنشرها على المنصة."
              )}
            </p>
          </section>

          {/* 5. License */}
          <section id="license" className="space-y-3">
            <h2 className="text-xl font-bold text-foreground border-b border-border/60 pb-2">
              {t("5. License Granted to WhiterChat", "٥. الترخيص الممنوح للمنصة")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t(
                "Solely for the purpose of operating, rendering, optimizing, and distributing your content to your intended audience (e.g., transcoding video files, caching thumbnails, serving via CDN, and displaying on follower feeds), you grant WhiterChat a non-exclusive, royalty-free, worldwide license to host, store, stream, and display your User Content.",
                "لغرض تشغيل وعرض وتحسين وتوصيل محتواك لجمهورك المحدد فقط (مثل معالجة جودة الفيديو والتخزين السحابي وعرض المنشور في خلاصة المتابعين)، فإنك تمنح المنصة ترخيصًا غير حصري ومجاني لاستضافة وبث وعرض المحتوى."
              )}
            </p>
          </section>

          {/* 6. Prohibited Activities */}
          <section id="conduct" className="space-y-3">
            <h2 className="text-xl font-bold text-destructive border-b border-border/60 pb-2 flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-destructive" />
              {t("6. Prohibited Conduct & Activities", "٦. الأنشطة والسلوكيات المحظورة")}
            </h2>
            <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside">
              <li>{t("Do not engage in harassment, cyberbullying, stalking, or targeted hate speech.", "يحظر التنمر الإلكتروني، التحرش، التهديد، أو خطاب الكراهية ضد أي شخص.")}</li>
              <li>{t("Do not post non-consensual intimate imagery, sexually explicit content, or violent gore.", "يحظر نشر المحتوى الإباحي، أو الصور الحميمية دون موافقة، أو مشاهد العنف المفرط.")}</li>
              <li>{t("Do not deploy automated bots, scrapers, mass like/follow fraud, or phishing attacks.", "يحظر استخدام الروبوتات البرمجية، أو جمع البيانات التلقائي (Scraping)، أو الاحتيال والتصيد.")}</li>
              <li>{t("Do not impersonate other individuals, brands, or public figures.", "يحظر انتحال صفة أي شخص آخر أو علامة تجارية.")}</li>
            </ul>
          </section>

          {/* 8. Moderation */}
          <section id="moderation" className="space-y-3">
            <h2 className="text-xl font-bold text-foreground border-b border-border/60 pb-2">
              {t("8. Community Moderation & Enforcement", "٨. الإشراف والعقوبات المجتمعية")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t(
                "We reserve the right to review, restrict, or remove any User Content that violates our Community Guidelines. Enforcement tiers include formal warnings, content deletion, temporary account suspension, and permanent account termination for severe or repeated infractions.",
                "تحتفظ المنصة بالحق في مراجعة أو إزالة أي محتوى يخالف إرشادات المجتمع. تشمل العقوبات: التنبيه الرسمي، حذف المحتوى، تقييد الميزات، والتعليق أو الإغلاق الدائم للحساب في الحالات الجسيمة."
              )}
            </p>
          </section>

          {/* 10. Disclaimers */}
          <section id="disclaimers" className="space-y-3">
            <h2 className="text-xl font-bold text-foreground border-b border-border/60 pb-2">
              {t("10. Disclaimers & Limitation of Liability", "١٠. إخلاء المسؤولية وحدودها")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t(
                "WhiterChat is provided 'as is' and 'as available' without warranties of any kind. To the maximum extent permitted by applicable law, WhiterChat shall not be liable for indirect, incidental, or consequential damages resulting from platform downtime or user conduct.",
                "تُقدم المنصة بحالتها الراهنة دون أي ضمانات صريحة أو ضمنية، ولا تتحمل المنصة المسؤولية عن أي أضرار غير مباشرة ناتجة عن انقطاع الخدمة أو سلوكيات المستخدمين."
              )}
            </p>
          </section>
        </div>
      </div>
    </InstitutionalLayout>
  );
}
