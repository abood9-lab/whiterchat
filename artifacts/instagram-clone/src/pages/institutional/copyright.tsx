import { useState } from "react";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { Copyright, ShieldAlert, Send, CheckCircle2, Loader2, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";

export default function CopyrightPolicyPage() {
  const { t, isRtl } = useI18n();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    ownerName: "",
    ownerEmail: "",
    workDescription: "",
    infringingUrl: "",
    statement: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ownerName.trim() || !formData.ownerEmail.trim() || !formData.workDescription.trim() || !formData.infringingUrl.trim()) {
      toast({
        title: t("Missing Information", "بيانات ناقصة"),
        description: t("Please fill in all required copyright claim fields.", "يرجى استكمال جميع بيانات طلب حماية حقوق الملكية."),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/institutional/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.ownerName.trim(),
          email: formData.ownerEmail.trim(),
          department: "legal",
          subject: `[DMCA/Copyright Notice] ${formData.infringingUrl.trim()}`,
          message: `Copyright Claim from: ${formData.ownerName}\nEmail: ${formData.ownerEmail}\n\nOriginal Work: ${formData.workDescription}\nInfringing URL / Post: ${formData.infringingUrl}\nStatement: ${formData.statement}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit claim");

      setTicketId(data.ticketId);
      toast({
        title: t("Notice Received", "تم استلام الإشعار"),
        description: t("Our copyright agent will review the submission.", "سيقوم مسؤول حقوق الملكية بمراجعة الطلب واتخاذ الإجراء اللازم."),
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
      activeSection="copyright"
      pageTitle={t("Copyright & DMCA Policy", "حقوق الملكية الفكرية والنشر")}
      pageSubtitle={t(
        "WhiterChat respects intellectual property rights and adheres to formal notice-and-takedown procedures.",
        "تحترم منصة WhiterChat حقوق الملكية الفكرية وتلتزم بالإجراءات القانونية المعتمدة لإزالة المحتوى المخالف."
      )}
    >
      <SEOHead
        title={t("Copyright & DMCA Takedown Policy | WhiterChat", "سياسة حقوق الملكية الفكرية والـ DMCA | WhiterChat")}
        description={t(
          "Submit formal copyright infringement notices, DMCA takedown requests, or review counter-notification procedures.",
          "أرسل إخطارات انتهاك حقوق النشر أو طلبات الإزالة القانونية أو تعرف على إجراءات الرد المعاكس."
        )}
        canonicalPath="/copyright"
      />

      <div className="max-w-4xl mx-auto space-y-10">
        {/* Policy Overview */}
        <section className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <Copyright className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground">{t("Notice-and-Takedown Process", "إجراءات الإخطار والإزالة")}</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t(
              "If you believe your copyrighted photographic, musical, or video work has been copied and published on WhiterChat in a manner that constitutes infringement, please submit a formal notice below with proof of authorization.",
              "إذا كنت تعتقد أن محتواك المحمي بحقوق النشر (صور، مقاطع صوتية، أو فيديوهات) قد تم نسخه ونشره على WhiterChat بصورة تنتهك حقوقك، يرجى تقديم إشعار رسمي عبر النموذج أدناه."
            )}
          </p>
        </section>

        {/* Claim Form or Success State */}
        {ticketId ? (
          <div className="p-8 rounded-3xl bg-card border border-emerald-500/30 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">
              {t("Notice Successfully Registered", "تم تسجيل الإشعار بنجاح")}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t(
                "Our designated copyright agent will review the identified URL and communicate via your provided email.",
                "سيقوم وكيل حقوق الملكية بمراجعة الرابط المذكور والتواصل معك عبر البريد الإلكتروني."
              )}
            </p>
            <div className="p-3 bg-muted/40 rounded-xl font-mono text-xs text-foreground inline-block">
              {t("Claim Ref:", "رقم المطالبة:")} #{ticketId}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-sm space-y-5">
            <h3 className="text-lg font-bold text-foreground">{t("Submit Copyright Notice", "تقديم إشعار انتهاك حقوق")}</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">{t("Copyright Owner / Authorized Agent *", "اسم صاحب الحق / الوكيل المعتمد *")}</label>
                <Input
                  required
                  placeholder="e.g. Acme Productions LLC"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">{t("Contact Email *", "البريد الإلكتروني الرسمي *")}</label>
                <Input
                  type="email"
                  required
                  placeholder="legal@acme.com"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">{t("Description of Original Copyrighted Work *", "وصف العمل الأصلي المحمي *")}</label>
              <Textarea
                required
                rows={2}
                placeholder={t("Describe the original photograph, track, or video and provide authorized reference links...", "صف العمل الأصلي مع إرفاق روابط إثبات الملكية...")}
                value={formData.workDescription}
                onChange={(e) => setFormData({ ...formData, workDescription: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">{t("WhiterChat Infringing Post URL or Username *", "رابط المنشور المخالف أو اسم الحساب على WhiterChat *")}</label>
              <Input
                required
                placeholder="e.g. /post/64f8a... or @violating_user"
                value={formData.infringingUrl}
                onChange={(e) => setFormData({ ...formData, infringingUrl: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">{t("Good Faith Statement & Signature", "إقرار بحسن النية والتوقيع الإلكتروني")}</label>
              <Textarea
                rows={2}
                placeholder={t("I state in good faith that the use is not authorized by the copyright owner...", "أقر بحسن النية بأن استخدام هذا المحتوى غير مصرح به من المالك...")}
                value={formData.statement}
                onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full font-semibold rounded-xl gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("Processing Notice...", "جارٍ إرسال الإشعار...")}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t("Submit Formal Notice", "إرسال الإشعار الرسمي")}</span>
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </InstitutionalLayout>
  );
}
