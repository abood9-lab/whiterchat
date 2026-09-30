import { useState } from "react";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { AlertCircle, Bug, CheckCircle2, Send, Loader2, Sparkles, Smartphone, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";

export default function ReportProblemPage() {
  const { t, isRtl } = useI18n();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    type: "bug",
    title: "",
    description: "",
    whatHappened: "",
    whatExpected: "",
    stepsToReproduce: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: t("Missing Fields", "حقول ناقصة"),
        description: t("Please provide a title and description.", "يرجى كتابة العنوان والوصف."),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("whiterchat_token");
      const res = await fetch(apiUrl("/api/feedback"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: formData.type,
          title: formData.title.trim(),
          description: formData.description.trim(),
          bugDetails: {
            whatHappened: formData.whatHappened.trim(),
            whatExpected: formData.whatExpected.trim(),
            stepsToReproduce: formData.stepsToReproduce.trim(),
            pageContext: window.location.pathname,
            browserInfo: navigator.userAgent,
          },
        }),
      });

      if (!res.ok) {
        // If guest or unauthorized, fallback gracefully to general contact
        await fetch(apiUrl("/api/institutional/contact"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Community Member",
            email: "guest-reporter@whiterchat.com",
            department: "report",
            subject: `[${formData.type.toUpperCase()}] ${formData.title.trim()}`,
            message: `${formData.description}\n\nWhat happened: ${formData.whatHappened}\nWhat expected: ${formData.whatExpected}\nSteps: ${formData.stepsToReproduce}`,
          }),
        });
      }

      setSubmitted(true);
      toast({
        title: t("Report Logged", "تم تسجيل البلاغ"),
        description: t("Thank you for helping us make WhiterChat better.", "شكرًا لمساعدتنا في تحسين تجربة WhiterChat."),
      });
    } catch (err: any) {
      toast({
        title: t("Error Submitting Report", "خطأ في تسجيل البلاغ"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <InstitutionalLayout
      activeSection="contact"
      pageTitle={t("Report a Technical Issue", "الإبلاغ عن مشكلة تقنية")}
      pageSubtitle={t(
        "Spotted a bug, broken button, video playback glitch, or styling issue? Help our engineering team reproduce and resolve it.",
        "هل لاحظت خطأً برمجيًا، أو مشكلة في تشغيل الفيديو، أو خللًا في التصميم؟ ساعد مهندسينا في تتبعه وإصلاحه فورًا."
      )}
    >
      <SEOHead
        title={t("Report a Technical Issue or Bug | WhiterChat Support", "الإبلاغ عن مشكلة تقنية أو خلل | دعم WhiterChat")}
        description={t(
          "Submit bug reports, reproduction steps, and UI glitch feedback directly to the WhiterChat engineering team.",
          "أرسل بلاغات الأخطاء البرمجية وملاحظات تجربة المستخدم مباشرة لفريق هندسة منصة WhiterChat."
        )}
        canonicalPath="/report-problem"
      />

      <div className="max-w-3xl mx-auto">
        {submitted ? (
          <div className="p-8 rounded-3xl bg-card border border-emerald-500/30 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">
              {t("Thank You For Your Bug Report", "شكرًا لإبلاغك عن المشكلة")}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t(
                "Our engineers review logged issues and roll out updates regularly. Your feedback directly shapes our roadmap.",
                "يقوم مهندسونا بمراجعة البلاغات وإطلاق التحديثات الدورية لإصلاحها. ملاحظاتك تسهم في تطوير المنصة."
              )}
            </p>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
                {t("Submit Another Issue", "الإبلاغ عن مشكلة أخرى")}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-sm space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">{t("Issue Category *", "نوع المشكلة *")}</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
              >
                <option value="bug">{t("Bug / Malfunction", "خطأ برمجي أو عطل")}</option>
                <option value="performance">{t("Slow Loading / Video Buffering", "بطء في التحميل أو تقطيع بالفيديو")}</option>
                <option value="ui">{t("Visual / Layout Glitch", "خلل في التصميم أو العرض")}</option>
                <option value="feature">{t("Feature Request / Enhancement", "اقتراح ميزة أو تحسين")}</option>
                <option value="other">{t("Other Technical Issue", "مشكلة تقنية أخرى")}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">{t("Summary Title *", "عنوان المشكلة *")}</label>
              <Input
                required
                placeholder={t("e.g. Video player controls freeze when switching Reels", "مثال: تجمد عناصر تحكم الفيديو عند التبديل بين الريلز")}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">{t("Description of what happened *", "وصف ما حدث *")}</label>
              <Textarea
                required
                rows={3}
                placeholder={t("Describe the unexpected behavior...", "اشرح السلوك غير المتوقع الذي واجهته...")}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">{t("What were you expecting?", "ما الذي كنت تتوقعه؟")}</label>
                <Input
                  placeholder={t("e.g. Video should continue playing seamlessly", "مثال: تشغيل الفيديو التالي بسلاسة")}
                  value={formData.whatExpected}
                  onChange={(e) => setFormData({ ...formData, whatExpected: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">{t("Steps to Reproduce", "خطوات تكرار المشكلة")}</label>
                <Input
                  placeholder={t("e.g. 1. Go to Reels -> 2. Swipe down twice", "مثال: ١. فتح الريلز -> ٢. التمرير لأسفل مرتين")}
                  value={formData.stepsToReproduce}
                  onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full font-semibold rounded-xl gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("Submitting Report...", "جارٍ إرسال البلاغ...")}</span>
                </>
              ) : (
                <>
                  <Bug className="w-4 h-4" />
                  <span>{t("Submit Technical Report", "إرسال تقرير المشكلة")}</span>
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </InstitutionalLayout>
  );
}
