import { Link } from "wouter";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { Shield, Lock, Key, Server, Bug, FileCheck, CheckCircle2, AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SecurityPage() {
  const { t, isRtl } = useI18n();

  const securityPillars = [
    {
      title: t("Authentication & Password Cryptography", "تشفير كلمات المرور والمصادقة"),
      desc: t(
        "Passwords are never stored in plaintext. We utilize bcrypt salted cryptographic hashes (cost factor 10) to guard against credential stuffing and rainbow table attacks.",
        "لا تُحفظ كلمات المرور بنص مجرد أبدًا؛ بل تُشفر عبر خوارزميات bcrypt المتقدمة لمنع الاختراق والتخمين."
      ),
      icon: Key,
    },
    {
      title: t("Secure Session Management (JWT)", "إدارة الجلسات الآمنة والـ JWT"),
      desc: t(
        "Sessions use cryptographically signed JSON Web Tokens with strict expiration windows and automated invalidation upon password reset or logout.",
        "تُدار الجلسات برموز JWT المشفرة ذات الصلاحية المحدودة مع إبطال الجلسات تلقائيًا عند تغيير كلمة المرور."
      ),
      icon: Lock,
    },
    {
      title: t("Transport Layer Security (TLS/HTTPS)", "تشفير قنوات النقل (TLS/HTTPS)"),
      desc: t(
        "100% of network traffic between your device and our Cloud Run microservices is encrypted with modern TLS 1.3 encryption suites.",
        "تُشفر كافة الاتصالات بين جهازك وخوادمنا السحابية باستخدام بروتوكولات التشفير الحديثة TLS 1.3."
      ),
      icon: Server,
    },
    {
      title: t("DDoS Defense & Rate Limiting", "الحماية من الهجمات والطلبات المفرطة"),
      desc: t(
        "API endpoints employ intelligent sliding-window rate limiters to mitigate brute-force attempts, automated spamming, and denial-of-service abuse.",
        "تُطبق واجهات التطبيقات حدود طلبات صارمة لحماية الحسابات من الهجمات المتكررة والبرمجيات الخبيثة."
      ),
      icon: Shield,
    },
  ];

  return (
    <InstitutionalLayout
      activeSection="security"
      pageTitle={t("Security Practices & Infrastructure", "الأمن السيبراني والبنية التحتية")}
      pageSubtitle={t(
        "Learn how WhiterChat designs and enforces modern cryptographic security standards to safeguard user accounts and system integrity.",
        "تعرف على كيفية تصميم وتطبيق معايير التشفير والأمان المتقدمة لحماية حسابات المستخدمين وسلامة المنصة."
      )}
    >
      <SEOHead
        title={t("Security Practices & Data Protection | WhiterChat", "ممارسات الأمان وحماية البيانات | منصة WhiterChat")}
        description={t(
          "Read about WhiterChat's encryption, bcrypt password hashing, secure JWT sessions, rate limiting, and vulnerability reporting procedures.",
          "اطلع على تفاصيل التشفير وحماية كلمات المرور وإدارة الجلسات الآمنة وإجراءات الإبلاغ الأمني في WhiterChat."
        )}
        canonicalPath="/security"
      />

      <div className="max-w-5xl mx-auto space-y-12">
        {/* Pillars Grid */}
        <section className="grid sm:grid-cols-2 gap-6">
          {securityPillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3 hover:border-primary/40 transition-colors"
              >
                <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-foreground">{pillar.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{pillar.desc}</p>
              </div>
            );
          })}
        </section>

        {/* Responsible Disclosure Banner */}
        <section className="p-8 rounded-3xl bg-gradient-to-br from-card to-muted/40 border border-border/80 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {t("For Security Researchers", "لباحثي الأمن السيبراني")}
            </span>
            <h2 className="text-2xl font-bold text-foreground">
              {t("Responsible Vulnerability Disclosure", "برنامج الإفصاح المسؤول عن الثغرات")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl">
              {t(
                "We appreciate independent security researchers who help keep our community safe. Review our disclosure guidelines and submit reports directly to our security triage team.",
                "نقدر مساهمات باحثي الأمن السيبراني المستقلين في حماية مجتمعنا. راجع إرشادات الإفصاح وأرسل تقريرك الأمني مباشرة لفريقنا."
              )}
            </p>
          </div>
          <Link href="/security/disclosure">
            <Button className="rounded-xl px-6 py-2.5 font-semibold shrink-0 gap-2">
              <Bug className="w-4 h-4" />
              <span>{t("Report a Vulnerability", "الإبلاغ عن ثغرة أمنية")}</span>
            </Button>
          </Link>
        </section>
      </div>
    </InstitutionalLayout>
  );
}
