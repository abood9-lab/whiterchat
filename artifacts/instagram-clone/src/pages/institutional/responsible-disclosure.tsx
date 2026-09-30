import { useState } from "react";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { Bug, ShieldCheck, AlertTriangle, CheckCircle2, Send, Loader2, FileCode, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";

export default function ResponsibleDisclosurePage() {
  const { t, isRtl } = useI18n();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    reporterName: "",
    reporterEmail: "",
    reporterHandle: "",
    vulnerabilityType: "Authentication Bypass",
    severity: "high" as "low" | "medium" | "high" | "critical",
    targetEndpointOrComponent: "",
    description: "",
    stepsToReproduce: "",
    impactAssessment: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.reporterName.trim() ||
      !formData.reporterEmail.trim() ||
      !formData.targetEndpointOrComponent.trim() ||
      !formData.description.trim() ||
      !formData.stepsToReproduce.trim() ||
      !formData.impactAssessment.trim()
    ) {
      toast({
        title: t("Missing Required Fields", "حقول مطلوبة ناقصة"),
        description: t("Please fill in all required report details.", "يرجى ملء جميع التفاصيل المطلوبة للتقرير."),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/institutional/security-report"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit report");

      setSubmittedReportId(data.reportId);
      toast({
        title: t("Security Report Received", "تم استلام التقرير الأمني"),
        description: t("Thank you for practicing responsible disclosure.", "شكرًا لك على اتباع ممارسات الإفصاح المسؤول."),
      });
    } catch (err: any) {
      toast({
        title: t("Submission Error", "خطأ في الإرسال"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <InstitutionalLayout
      activeSection="security"
      pageTitle={t("Responsible Vulnerability Disclosure", "برنامج الإفصاح المسؤول عن الثغرات")}
      pageSubtitle={t(
        "Guidelines and secure intake for independent cybersecurity researchers reporting potential platform vulnerabilities.",
        "إرشادات ونموذج الإرسال الآمن لباحثي الأمن السيبراني المستقلين للإبلاغ عن الثغرات والملاحظات الأمنية."
      )}
    >
      <SEOHead
        title={t("Responsible Vulnerability Disclosure | WhiterChat Security", "الإفصاح المسؤول عن الثغرات | أمن WhiterChat")}
        description={t(
          "Submit potential security findings, authentication bugs, or injection vulnerabilities directly to the WhiterChat Security Operations team.",
          "أرسل تقارير الثغرات الأمنية وملاحظات الحماية مباشرة لفريق أمن المعلومات في منصة WhiterChat."
        )}
        canonicalPath="/security/disclosure"
      />

      <div className="max-w-4xl mx-auto space-y-10">
        {/* Scope Guidelines */}
        <section className="grid sm:grid-cols-2 gap-4 text-xs">
          <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-2">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>{t("In-Scope Findings", "المجالات المشمولة في البرنامج")}</span>
            </h3>
            <ul className="space-y-1.5 text-muted-foreground list-disc list-inside">
              <li>{t("Authentication / Authorization bypasses (IDOR).", "تجاوز صلاحيات المصادقة والوصول المباشر (IDOR).")}</li>
              <li>{t("Server-side request forgery (SSRF) and remote execution.", "ثغرات حقن الأوامر وطلب الخوادم (SSRF).")}</li>
              <li>{t("Stored Cross-Site Scripting (XSS) and injection vectors.", "ثغرات البرمجة عبر المواقع (Stored XSS) وحقن البيانات.")}</li>
              <li>{t("Significant token or credential exposure.", "تسريب رموز الجلسات أو البيانات الحساسة.")}</li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-2">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <span>{t("Out-of-Scope (Do Not Test)", "المجالات المستثناة (يحظر اختبارها)")}</span>
            </h3>
            <ul className="space-y-1.5 text-muted-foreground list-disc list-inside">
              <li>{t("Denial of Service (DoS/DDoS) and volume flooding.", "هجمات حجب الخدمة (DDoS) والإغراق بالطلبات.")}</li>
              <li>{t("Social engineering, phishing, or physical attacks.", "الهندسة الاجتماعية أو التصيد أو الهجمات المادية.")}</li>
              <li>{t("Automated scanner reports with no validated proof-of-concept.", "تقارير الماسحات الآلية بدون إثبات مفهوم فعلي (PoC).")}</li>
            </ul>
          </div>
        </section>

        {/* Submission Form or Success State */}
        {submittedReportId ? (
          <div className="p-8 rounded-3xl bg-card border border-emerald-500/30 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">
              {t("Report Successfully Triaged", "تم استلام التقرير بنجاح")}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t(
                "Our security operations engineers have received your submission. We acknowledge reports within 24 to 48 hours.",
                "استلم مهندسو الأمان تقريرك بنجاح. نقوم بالرد وتأكيد الاستلام خلال ٢٤ إلى ٤٨ ساعة عمل."
              )}
            </p>
            <div className="p-3 bg-muted/40 rounded-xl font-mono text-xs text-foreground inline-block">
              {t("Report Ref:", "رقم المرجع:")} #{submittedReportId}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-sm space-y-6">
            <div className="border-b border-border/60 pb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Bug className="w-5 h-5 text-primary" />
                <span>{t("Submit Vulnerability Report", "إرسال تقرير أمني")}</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {t("All reports are treated with strict confidentiality.", "تُعامل كافة التقارير بسرية تامة واحترافية.")}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">{t("Your Name / Handle *", "اسمك أو لقبك *")}</label>
                <Input
                  required
                  placeholder="e.g. Alex Rivera"
                  value={formData.reporterName}
                  onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">{t("Email Address *", "البريد الإلكتروني للتواصل *")}</label>
                <Input
                  type="email"
                  required
                  placeholder="alex@security.org"
                  value={formData.reporterEmail}
                  onChange={(e) => setFormData({ ...formData, reporterEmail: e.target.value })}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">{t("Vulnerability Category *", "فئة الثغرة *")}</label>
                <select
                  value={formData.vulnerabilityType}
                  onChange={(e) => setFormData({ ...formData, vulnerabilityType: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
                >
                  <option value="Authentication Bypass">Authentication Bypass / Broken Auth</option>
                  <option value="IDOR / Access Control">Insecure Direct Object Reference (IDOR)</option>
                  <option value="Cross-Site Scripting (XSS)">Cross-Site Scripting (XSS)</option>
                  <option value="Server-Side Injection">Server-Side Injection (SQLi/NoSQLi)</option>
                  <option value="SSRF">Server-Side Request Forgery (SSRF)</option>
                  <option value="Information Disclosure">Information Disclosure</option>
                  <option value="Other">Other Vulnerability</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">{t("Assessed Severity *", "درجة الخطورة التقديرية *")}</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
                >
                  <option value="low">Low (Minor info disclosure / UI bug)</option>
                  <option value="medium">Medium (Moderate impact / restricted scope)</option>
                  <option value="high">High (Privilege escalation / Auth bypass)</option>
                  <option value="critical">Critical (Remote code execution / Database dump)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">{t("Target Endpoint or Component *", "المكون أو الرابط المتأثر *")}</label>
              <Input
                required
                placeholder="e.g. POST /api/institutional/status or WebSocket authentication handshake"
                value={formData.targetEndpointOrComponent}
                onChange={(e) => setFormData({ ...formData, targetEndpointOrComponent: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">{t("Vulnerability Description *", "وصف الثغرة *")}</label>
              <Textarea
                required
                rows={3}
                placeholder={t("Explain the root cause and why this vulnerability exists...", "اشرح السبب الجذري للثغرة وكيفية عملها...")}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">{t("Steps to Reproduce (PoC) *", "خطوات إعادة الإنتاج (إثبات المفهوم) *")}</label>
              <Textarea
                required
                rows={4}
                className="font-mono text-xs"
                placeholder={"1. Send HTTP POST request with header...\n2. Observe token mismatch response...\n3. Data exposed without validation..."}
                value={formData.stepsToReproduce}
                onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">{t("Impact Assessment *", "تقييم الأثر والمخاطر *")}</label>
              <Textarea
                required
                rows={2}
                placeholder={t("What could an attacker achieve with this vulnerability?", "ما الذي يمكن للمهاجم تحقيقه عبر هذه الثغرة؟")}
                value={formData.impactAssessment}
                onChange={(e) => setFormData({ ...formData, impactAssessment: e.target.value })}
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full font-semibold rounded-xl gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("Transmitting Securely...", "جارٍ الإرسال الآمن...")}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t("Submit Vulnerability Report", "إرسال التقرير الأمني")}</span>
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </InstitutionalLayout>
  );
}
