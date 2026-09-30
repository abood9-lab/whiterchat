import { useState, useEffect } from "react";
import { Link } from "wouter";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { Briefcase, MapPin, Search, ArrowRight, ArrowLeft, Users, Zap, Heart, Sparkles, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api-url";

interface Job {
  id: string;
  slug: string;
  title: string;
  titleAr: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  summary: string;
  summaryAr: string;
}

export default function CareersPage() {
  const { t, isRtl } = useI18n();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetch(apiUrl(`/api/institutional/jobs?department=${department}&q=${encodeURIComponent(searchTerm)}`))
      .then((res) => res.json())
      .then((data) => {
        if (data.jobs) setJobs(data.jobs);
      })
      .catch((err) => console.error("Failed to load jobs", err))
      .finally(() => setLoading(false));
  }, [department, searchTerm]);

  const perks = [
    {
      title: t("100% Remote & Asynchronous", "عمل عن بُعد بنسبة 100%"),
      desc: t("Work from wherever you are happiest and most productive, across any global timezone.", "اعمل بحرية من أي مكان في العالم مع مرونة تامة في أوقات العمل."),
      icon: Globe,
    },
    {
      title: t("High-Impact Engineering", "تأثير هندسي واسع"),
      desc: t("Ship code directly to millions of daily creators with zero unnecessary bureaucracy.", "اكتب أكوادًا تصل مباشرة لملايين المستخدمين مع بيئة عمل سريعة ومرنة."),
      icon: Zap,
    },
    {
      title: t("Competitive Compensation", "حزم مكافآت تنافسية"),
      desc: t("Top-tier salaries, performance equity grants, and generous wellness stipends.", "رواتب مجزية وحصص ملكية وبدل صحي ورياضي مستمر."),
      icon: Heart,
    },
    {
      title: t("Top-Tier Equipment", "أحدث المعدات التقنية"),
      desc: t("Latest MacBook Pro laptops, 4K displays, and dedicated home office setups.", "أحدث أجهزة MacBook Pro وشاشات 4K وميزانية لتجهيز مكتبك المنزلي."),
      icon: Sparkles,
    },
  ];

  return (
    <InstitutionalLayout
      activeSection="careers"
      pageTitle={t("Careers at WhiterChat", "انضم إلى فريق WhiterChat")}
      pageSubtitle={t(
        "Build the future of visual social connection, high-frame-rate video discovery, and AI-assisted creative tools with a passionate, remote-first team.",
        "ساهم في بناء الجيل القادم من منصات التواصل البصري والريلز سريعة الاستجابة وأدوات الذكاء الاصطناعي مع فريق عالمي يعمل عن بُعد."
      )}
    >
      <SEOHead
        title={t("Careers & Open Engineering Positions | WhiterChat", "الوظائف وفرص العمل المتاحة | منصة WhiterChat")}
        description={t(
          "Explore remote career opportunities in Frontend, Backend, Product Design, and Trust & Safety at WhiterChat.",
          "اكتشف الوظائف الشاغرة وفرص العمل عن بُعد في هندسة البرمجيات والتصميم والأمان في WhiterChat."
        )}
        canonicalPath="/careers"
      />

      <div className="max-w-6xl mx-auto space-y-16">
        {/* Perks / Culture Section */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {t("Why Build With Us?", "لماذا تبني مستقبلك معنا؟")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              {t(
                "We champion craft, autonomy, and empathetic collaboration in everything we engineer.",
                "نلتزم بالإتقان الحرفي والاستقلالية والتعاون الخلاق في كل ميزة نطورها."
              )}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {perks.map((perk, idx) => {
              const Icon = perk.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-2.5 hover:border-primary/40 transition-colors"
                >
                  <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">{perk.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{perk.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Job Openings Header & Filter Bar */}
        <section id="openings" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-primary" />
                <span>{t("Open Positions", "الوظائف المتاحة حاليًا")}</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {t(`${jobs.length} open roles across engineering and design`, `${jobs.length} وظيفة متاحة في الهندسة والتصميم`)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("Filter by title...", "ابحث بالمسمى الوظيفي...")}
                  className="pl-9 rtl:pr-9 rtl:pl-3 h-9 text-xs rounded-xl"
                />
              </div>

              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="h-9 rounded-xl border border-input bg-card px-3 text-xs text-foreground"
              >
                <option value="all">{t("All Departments", "كافة الأقسام")}</option>
                <option value="Engineering">{t("Engineering", "الهندسة البرمجية")}</option>
                <option value="Design">{t("Design", "التصميم")}</option>
                <option value="Trust & Safety">{t("Trust & Safety", "الثقة والأمان")}</option>
              </select>
            </div>
          </div>

          {/* Job Listings Cards */}
          <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                {t("Loading open roles...", "جارٍ تحميل الوظائف المتاحة...")}
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-muted/20 border border-border text-sm text-muted-foreground space-y-2">
                <p>{t("No positions match your filter.", "لا توجد وظائف مطابقة لبحثك حاليًا.")}</p>
                <Button variant="outline" size="sm" onClick={() => { setDepartment("all"); setSearchTerm(""); }}>
                  {t("Clear Filters", "إعادة تعيين الفلاتر")}
                </Button>
              </div>
            ) : (
              jobs.map((job) => (
                <Link key={job.id} href={`/careers/${job.slug}`}>
                  <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm hover:border-primary/50 transition-all cursor-pointer group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {job.department}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{job.location}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">• {job.type}</span>
                      </div>
                      <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                        {isRtl ? job.titleAr || job.title : job.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {isRtl ? job.summaryAr || job.summary : job.summary}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-primary shrink-0 self-end sm:self-center">
                      <span>{t("View Role & Apply", "تفاصيل الوظيفة والتقديم")}</span>
                      {isRtl ? <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> : <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </InstitutionalLayout>
  );
}
