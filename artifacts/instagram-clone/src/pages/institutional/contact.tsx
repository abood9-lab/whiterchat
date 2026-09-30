import { useState } from "react";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { Mail, MessageSquare, Send, CheckCircle2, Loader2, MapPin, Building, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";

export default function ContactUsPage() {
  const { t, isRtl } = useI18n();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "general",
    subject: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      toast({
        title: t("Missing Information", "بيانات ناقصة"),
        description: t("Please complete all required fields.", "يرجى ملء جميع الحقول المطلوبة."),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/institutional/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit message");

      setTicketId(data.ticketId);
      toast({
        title: t("Message Delivered", "تم استلام رسالتك بنجاح"),
        description: t("Our team will review and reply via email.", "سيقوم فريقنا بمراجعة الرسالة والرد عبر بريدك الإلكتروني."),
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
      activeSection="contact"
      pageTitle={t("Contact WhiterChat", "تواصل معنا")}
      pageSubtitle={t(
        "Have a question, feedback, partnership inquiry, or technical request? We are here to help.",
        "هل لديك استفسار أو اقتراح أو طلب شراكة تجارية أو دعم فني؟ فريقنا متواجد لمساعدتك."
      )}
    >
      <SEOHead
        title={t("Contact WhiterChat – Support & Inquiries", "تواصل مع WhiterChat – الدعم والاستفسارات")}
        description={t(
          "Get in touch with the WhiterChat team for customer support, press inquiries, business partnerships, or general feedback.",
          "تواصل مع فريق منصة WhiterChat للدعم الفني، والتواصل الإعلامي، واستفسارات الشراكات العامة."
        )}
        canonicalPath="/contact"
      />

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Information Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <span>{t("Direct Departments", "الأقسام المباشرة")}</span>
            </h3>

            <div className="space-y-3 text-xs text-muted-foreground">
              <div>
                <strong className="text-foreground block">{t("General Support", "الدعم الفني والعام")}</strong>
                <span>support@whiterchat.com</span>
              </div>
              <div>
                <strong className="text-foreground block">{t("Press & Media", "الصحافة والإعلام")}</strong>
                <span>press@whiterchat.com</span>
              </div>
              <div>
                <strong className="text-foreground block">{t("Privacy & Legal", "الخصوصية والشؤون القانونية")}</strong>
                <span>privacy@whiterchat.com</span>
              </div>
              <div>
                <strong className="text-foreground block">{t("Security Team", "أمن المعلومات")}</strong>
                <span>security@whiterchat.com</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-muted/30 border border-border/60 text-xs text-muted-foreground space-y-2">
            <strong className="text-foreground block">{t("Response SLA", "معدل سرعة الاستجابة")}</strong>
            <p>
              {t(
                "We typically reply to general inquiries within 24–48 business hours. Security and urgent abuse reports are triaged 24/7.",
                "نقوم بالرد على الاستفسارات العامة خلال ٢٤ إلى ٤٨ ساعة عمل. ويتم فحص البلاغات الأمنية العاجلة على مدار الساعة."
              )}
            </p>
          </div>
        </div>

        {/* Contact Form or Success View */}
        <div className="lg:col-span-8">
          {ticketId ? (
            <div className="p-8 rounded-3xl bg-card border border-emerald-500/30 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                {t("Inquiry Submitted Successfully", "تم إرسال استفسارك بنجاح")}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {t(
                  "Thank you for contacting us. A confirmation has been generated and our team will get back to you shortly.",
                  "شكرًا لتواصلك معنا. تم تسجيل تذكرتك وسيقوم فريقنا بالرد عليك قريبًا."
                )}
              </p>
              <div className="p-3 bg-muted/40 rounded-xl font-mono text-xs text-foreground inline-block">
                {t("Ticket Reference:", "رقم المرجع:")} #{ticketId}
              </div>
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setTicketId(null)}>
                  {t("Send Another Message", "إرسال رسالة أخرى")}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-sm space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">{t("Your Name *", "الاسم الكامل *")}</label>
                  <Input
                    required
                    placeholder="e.g. Maya Chen"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">{t("Email Address *", "البريد الإلكتروني *")}</label>
                  <Input
                    type="email"
                    required
                    placeholder="maya@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">{t("Department *", "القسم المعني *")}</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
                  >
                    <option value="general">{t("General Inquiries", "استفسارات عامة")}</option>
                    <option value="support">{t("Account & Technical Support", "الدعم الفني للحساب")}</option>
                    <option value="business">{t("Business Partnerships", "الشراكات والأعمال")}</option>
                    <option value="press">{t("Press & Media", "الصحافة والإعلام")}</option>
                    <option value="security">{t("Security & Privacy", "الأمان والخصوصية")}</option>
                    <option value="careers">{t("Careers & Recruiting", "الوظائف والتوظيف")}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">{t("Subject *", "الموضوع *")}</label>
                  <Input
                    required
                    placeholder={t("Brief summary of your message", "ملخص موجز لرسالتك")}
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">{t("Message *", "نص الرسالة *")}</label>
                <Textarea
                  required
                  rows={5}
                  placeholder={t("Please provide clear details so we can assist you promptly...", "يرجى كتابة التفاصيل بوضوح لنتمكن من خدمتك بأفضل شكل...")}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full font-semibold rounded-xl gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t("Sending...", "جارٍ الإرسال...")}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t("Send Message", "إرسال الرسالة")}</span>
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </InstitutionalLayout>
  );
}
