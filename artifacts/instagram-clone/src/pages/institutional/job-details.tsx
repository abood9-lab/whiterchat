import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { Briefcase, MapPin, CheckCircle2, ArrowRight, ArrowLeft, Send, Loader2, FileText, Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";

export default function JobDetailsPage() {
  const [, params] = useRoute<{ slug: string }>("/careers/:slug");
  const { t, isRtl } = useI18n();
  const { toast } = useToast();

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    resumeUrl: "",
    coverLetter: "",
  });

  useEffect(() => {
    if (!params?.slug) return;
    fetch(apiUrl(`/api/institutional/jobs/${params.slug}`))
      .then((res) => res.json())
      .then((data) => {
        if (data.job) setJob(data.job);
      })
      .catch((err) => console.error("Failed to load job details", err))
      .finally(() => setLoading(false));
  }, [params?.slug]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.resumeUrl.trim()) {
      toast({
        title: t("Missing Required Info", "بيانات مطلوبة ناقصة"),
        description: t("Please provide your name, email, and resume link.", "يرجى كتابة الاسم والبريد الإلكتروني ورابط السيرة الذاتية."),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/institutional/apply-job"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          jobSlug: job.slug,
          jobTitle: job.title,
          ...formData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit application");

      setApplicationId(data.applicationId);
      toast({
        title: t("Application Submitted", "تم تقديم طلبك بنجاح"),
        description: t("Our recruiting team will review your profile.", "سيقوم فريق التوظيف بمراجعة سيرتك الذاتية."),
      });
    } catch (err: any) {
      toast({
        title: t("Application Error", "خطأ في التقديم"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <InstitutionalLayout activeSection="careers">
        <div className="p-16 text-center text-sm text-muted-foreground">
          {t("Loading position details...", "جارٍ تحميل تفاصيل الوظيفة...")}
        </div>
      </InstitutionalLayout>
    );
  }

  if (!job) {
    return (
      <InstitutionalLayout activeSection="careers">
        <div className="max-w-md mx-auto p-8 text-center space-y-4">
          <h2 className="text-xl font-bold">{t("Job Not Found", "الوظيفة غير موجودة")}</h2>
          <p className="text-xs text-muted-foreground">{t("This job posting may have been filled or expired.", "قد تكون هذه الوظيفة أُغلقت أو انتهت مدة التقديم عليها.")}</p>
          <Link href="/careers">
            <Button size="sm">{t("Back to Careers", "العودة للوظائف")}</Button>
          </Link>
        </div>
      </InstitutionalLayout>
    );
  }

  const jobTitle = isRtl ? job.titleAr || job.title : job.title;
  const jobDescription = isRtl ? job.descriptionAr || job.description : job.description;
  const responsibilities = isRtl ? job.responsibilitiesAr || job.responsibilities : job.responsibilities;
  const requirements = isRtl ? job.requirementsAr || job.requirements : job.requirements;
  const benefits = isRtl ? job.benefitsAr || job.benefits : job.benefits;

  return (
    <InstitutionalLayout activeSection="careers">
      <SEOHead
        title={`${jobTitle} | WhiterChat Careers`}
        description={job.summary}
        canonicalPath={`/careers/${job.slug}`}
      />

      <div className="max-w-4xl mx-auto space-y-10">
        {/* Breadcrumb Back Link */}
        <Link href="/careers" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium">
          {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
          <span>{t("Back to All Positions", "العودة لكافة الوظائف")}</span>
        </Link>

        {/* Job Header */}
        <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-md">
              {job.department}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{job.location}</span>
            </span>
            <span className="text-xs text-muted-foreground">• {job.type}</span>
            <span className="text-xs text-muted-foreground">• {job.experience}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{jobTitle}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{jobDescription}</p>
        </div>

        {/* Responsibilities & Requirements */}
        <div className="space-y-8 text-sm">
          {responsibilities?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">{t("Key Responsibilities", "المسؤوليات الرئيسية")}</h2>
              <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground list-disc list-inside">
                {responsibilities.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {requirements?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">{t("Qualifications & Skills", "المؤهلات والمهارات المطلوبة")}</h2>
              <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground list-disc list-inside">
                {requirements.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {benefits?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">{t("Benefits & Perks", "المزايا والمكافآت")}</h2>
              <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground list-disc list-inside">
                {benefits.map((b: string, i: number) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Application Form */}
        <div id="apply" className="pt-6 border-t border-border">
          {applicationId ? (
            <div className="p-8 rounded-3xl bg-card border border-emerald-500/30 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                {t("Application Submitted Successfully", "تم إرسال طلب التقديم بنجاح")}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {t(
                  "Thank you for applying to WhiterChat. We will carefully review your credentials and get back to you.",
                  "شكرًا لتقديمك على وظائف WhiterChat. سنقوم بمراجعة سيرتك الذاتية والتواصل معك."
                )}
              </p>
              <div className="p-3 bg-muted/40 rounded-xl font-mono text-xs text-foreground inline-block">
                {t("Application ID:", "رقم الطلب:")} #{applicationId}
              </div>
            </div>
          ) : (
            <form onSubmit={handleApply} className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-sm space-y-5">
              <div className="border-b border-border/60 pb-3">
                <h3 className="text-xl font-bold text-foreground">{t("Apply for this Role", "التقديم على هذه الوظيفة")}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t("Submit your profile and resume details.", "أدخل بياناتك ورابط سيرتك الذاتية.")}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">{t("Full Legal Name *", "الاسم الكامل *")}</label>
                  <Input
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">{t("Email Address *", "البريد الإلكتروني *")}</label>
                  <Input
                    type="email"
                    required
                    placeholder="sarah@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">{t("Phone Number", "رقم الهاتف")}</label>
                  <Input
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">{t("Current Location (City, Country)", "محل الإقامة (المدينة، الدولة)")}</label>
                  <Input
                    placeholder="e.g. Cairo, Egypt or London, UK"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">{t("Resume URL (Google Drive / Dropbox / PDF) *", "رابط السيرة الذاتية (Google Drive / Dropbox / PDF) *")}</label>
                <Input
                  required
                  placeholder="https://drive.google.com/file/d/.../view"
                  value={formData.resumeUrl}
                  onChange={(e) => setFormData({ ...formData, resumeUrl: e.target.value })}
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">{t("LinkedIn Profile", "رابط LinkedIn")}</label>
                  <Input
                    placeholder="https://linkedin.com/in/..."
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">{t("GitHub Profile", "رابط GitHub")}</label>
                  <Input
                    placeholder="https://github.com/..."
                    value={formData.githubUrl}
                    onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">{t("Portfolio / Website", "موقعك الشخصي / معرض الأعمال")}</label>
                  <Input
                    placeholder="https://myportfolio.dev"
                    value={formData.portfolioUrl}
                    onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">{t("Cover Letter / Note to Team", "رسالة تقديمية / ملاحظات للفريق")}</label>
                <Textarea
                  rows={4}
                  placeholder={t("Tell us why you are excited about WhiterChat...", "أخبرنا عن شغفك بالانضمام لمنصة WhiterChat...")}
                  value={formData.coverLetter}
                  onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full font-semibold rounded-xl gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t("Submitting Application...", "جارٍ إرسال الطلب...")}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t("Submit Application", "إرسال طلب التوظيف")}</span>
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
