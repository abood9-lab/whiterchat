import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Globe,
  RefreshCw,
  Search,
  ExternalLink,
  Share2,
  Bookmark,
  CheckCircle2,
  Shield,
  Cpu,
  Lock,
  Layers,
  ArrowRight,
  ArrowLeft,
  Mail,
  Newspaper,
  TrendingUp,
  Clock,
  Database,
  Building2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { apiUrl } from "@/lib/api-url";

export interface SovereignNewsArticle {
  id: string;
  title: string;
  titleAr: string;
  summary: string;
  summaryAr: string;
  category: "Cloud Sovereignty" | "Data Governance" | "National AI" | "Cyber Resilience" | "Regulatory Frameworks";
  source: string;
  sourceUrl: string;
  publishedAt: string;
  readTime: string;
  sovereigntyPillar: "Data Autonomy" | "AI Sovereignty" | "Infra Resilience" | "Cloud Independence";
  keyTakeaway: string;
  keyTakeawayAr: string;
  relevanceScore: number;
  tags: string[];
}

interface SovereignNewsSectionProps {
  className?: string;
  titleOverride?: string;
  subtitleOverride?: string;
  showSubscriptionBox?: boolean;
}

export function SovereignNewsSection({
  className = "",
  titleOverride,
  subtitleOverride,
  showSubscriptionBox = true,
}: SovereignNewsSectionProps) {
  const { t, isRtl } = useI18n();
  const { toast } = useToast();

  const [articles, setArticles] = useState<SovereignNewsArticle[]>([]);
  const [featuredArticle, setFeaturedArticle] = useState<SovereignNewsArticle | null>(null);
  const [categories, setCategories] = useState<string[]>(["All", "Cloud Sovereignty", "Data Governance", "National AI", "Cyber Resilience"]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [emailInput, setEmailInput] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const fetchNews = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const url = apiUrl(`/api/institutional/news/sovereign-infrastructure${refresh ? "?refresh=true" : ""}`);
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch news");
      const data = await res.json();

      if (Array.isArray(data.articles)) {
        setArticles(data.articles);
        setFeaturedArticle(data.featuredArticle || data.articles[0] || null);
      }
      if (Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
      if (data.lastUpdated) {
        setLastUpdated(data.lastUpdated);
      }
      if (refresh) {
        toast({
          title: t("News Feed Refreshed", "تم تحديث موجز الأخبار"),
          description: t("Fetched latest sovereign infrastructure insights.", "تم جلب أحدث تحليلات وأخبار السيادة الرقمية."),
        });
      }
    } catch {
      // Fallback handles gracefully
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleShare = (article: SovereignNewsArticle) => {
    const shareUrl = article.sourceUrl || window.location.href;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(article.id);
    toast({
      title: t("Link Copied", "تم نسخ الرابط"),
      description: t("Article reference link copied to clipboard.", "تم نسخ رابط المرجع للحافظة."),
    });
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes("@")) return;
    setIsSubscribed(true);
    toast({
      title: t("Subscribed Successfully!", "تم الاشتراك بنجاح!"),
      description: t("You will receive sovereign infrastructure digests directly.", "ستصلك نشرات الأخبار والتحليلات السيادية المباشرة."),
    });
    setEmailInput("");
  };

  const filteredArticles = articles.filter((art) => {
    const matchesCat = selectedCategory === "All" || art.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCat;
    const textToSearch = `${art.title} ${art.titleAr} ${art.summary} ${art.summaryAr} ${art.tags.join(" ")} ${art.keyTakeaway}`.toLowerCase();
    return matchesCat && textToSearch.includes(query);
  });

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "Cloud Sovereignty":
        return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
      case "Data Governance":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "National AI":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "Cyber Resilience":
        return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
      default:
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    }
  };

  return (
    <section className={`space-y-8 ${className}`}>
      {/* ── Section Header Banner ────────────────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 border border-border/80 shadow-sm relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t("PIWAIC Intelligence", "ذكاء PIWAIC السيادي")}</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>{t("AI Grounded Live Feed", "موجز موثق بالذكاء الاصطناعي")}</span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {titleOverride || t("Sovereign Digital Infrastructure News", "أخبار وتحليلات البنية التحتية الرقمية السيادية")}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {subtitleOverride ||
                t(
                  "Real-time intelligence on cloud sovereignty, localized key management, national AI autonomy, and cyber resilience.",
                  "متابعة حية وشاملة لأخبار السحابة السيادية، وإدارة مفاتيح التشفير الوطنية، واستقلالية الذكاء الاصطناعي، والأمن السيبراني."
                )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchNews(true)}
              disabled={isRefreshing}
              className="rounded-xl px-4 gap-2 font-semibold text-xs h-10 border-border/80 hover:bg-secondary"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-primary ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? t("Refreshing...", "جارٍ التحديث...") : t("Refresh Live Feed", "تحديث الموجز الحي")}</span>
            </Button>
          </div>
        </div>

        {/* ── Search & Category Filter Controls ──────────────────────────────── */}
        <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {cat === "All" ? t("All Topics", "جميع المواضيع") : cat}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("Search sovereign news...", "البحث في الأخبار السيادية...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 rtl:pl-3 rtl:pr-9 text-xs rounded-xl bg-background/80 border-border/80"
            />
          </div>
        </div>
      </div>

      {/* ── Featured Top Breaking Story Banner ────────────────────────────── */}
      {featuredArticle && !searchQuery && selectedCategory === "All" && (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-card to-purple-950/30 border border-indigo-500/30 shadow-lg relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{t("Featured Insight", "تحليل بارز")}</span>
            </span>

            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{featuredArticle.readTime}</span>
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">
              {isRtl ? featuredArticle.titleAr : featuredArticle.title}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              {isRtl ? featuredArticle.summaryAr : featuredArticle.summary}
            </p>
          </div>

          {/* Key Insight Box */}
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-1 text-xs">
            <span className="font-bold text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t("Key Takeaway", "الرؤية الأساسية")}:</span>
            </span>
            <p className="text-foreground/90 font-medium">
              {isRtl ? featuredArticle.keyTakeawayAr : featuredArticle.keyTakeaway}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>{featuredArticle.source}</span>
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleShare(featuredArticle)}
                className="rounded-xl px-3 h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              >
                {copiedId === featuredArticle.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{t("Share", "مشاركة")}</span>
              </Button>

              <a href={featuredArticle.sourceUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="rounded-xl px-4 h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground">
                  <span>{t("Read Full Report", "قراءة التقرير الكامل")}</span>
                  {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Articles Grid ────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="p-6 rounded-3xl bg-card border border-border/80 space-y-4 animate-pulse">
              <div className="w-24 h-5 bg-muted rounded-full" />
              <div className="w-full h-12 bg-muted rounded-xl" />
              <div className="w-full h-16 bg-muted rounded-xl" />
              <div className="w-full h-8 bg-muted rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-card border border-border/80 space-y-3">
          <Newspaper className="w-10 h-10 mx-auto text-muted-foreground opacity-50" />
          <h4 className="font-bold text-foreground text-base">
            {t("No articles found", "لم يتم العثور على مقالات")}
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {t("Try clearing your search query or switching categories.", "جرب تعديل كلمات البحث أو اختيار تصنيف آخر.")}
          </p>
          <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}>
            {t("Reset Filters", "إعادة ضبط التصفية")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((art) => (
            <div
              key={art.id}
              className="p-6 rounded-3xl bg-card border border-border/80 hover:border-primary/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-5 group"
            >
              <div className="space-y-3">
                {/* Header Category & Pillar Badges */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(art.category)}`}>
                    {art.category}
                  </span>

                  <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{art.readTime}</span>
                  </span>
                </div>

                {/* Title & Summary */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-foreground text-base group-hover:text-primary transition-colors leading-snug line-clamp-2">
                    {isRtl ? art.titleAr : art.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {isRtl ? art.summaryAr : art.summary}
                  </p>
                </div>

                {/* Key Insight callout box */}
                <div className="p-3 rounded-2xl bg-secondary/50 border border-border/60 text-xs space-y-1">
                  <span className="font-bold text-primary flex items-center gap-1 text-[11px]">
                    <Shield className="w-3 h-3" />
                    <span>{t("Key Insight", "رؤية المحلل")}:</span>
                  </span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-2">
                    {isRtl ? art.keyTakeawayAr : art.keyTakeaway}
                  </p>
                </div>
              </div>

              {/* Bottom Footer Actions */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-muted-foreground truncate max-w-[120px]">
                  {art.source}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleShare(art)}
                    className="w-8 h-8 rounded-xl hover:bg-secondary text-muted-foreground"
                    title={t("Share Article", "مشاركة المقال")}
                  >
                    {copiedId === art.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                  </Button>

                  <a href={art.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="rounded-xl h-8 px-3 text-xs font-semibold gap-1 border-border/80">
                      <span>{t("Read", "قراءة")}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Industry Newsletter Subscription Box ──────────────────────────── */}
      {showSubscriptionBox && (
        <div className="p-8 rounded-3xl bg-gradient-to-r from-primary/10 via-card to-purple-500/10 border border-primary/20 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm">
            <Mail className="w-6 h-6" />
          </div>

          <div className="space-y-1 max-w-lg mx-auto">
            <h3 className="text-lg font-bold text-foreground">
              {t("Subscribe to Sovereign Infrastructure Digest", "اشترك في نشرة البنية التحتية السيادية")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t(
                "Receive weekly intelligence briefings on global data sovereignty laws, local AI clusters, and sovereign cloud frameworks.",
                "احصل على تحليلات أسبوعية حصرية حول قوانين السيادة الرقمية، وسحب البيانات الوطنية، واستقلالية الذكاء الاصطناعي."
              )}
            </p>
          </div>

          {isSubscribed ? (
            <div className="p-3 max-w-md mx-auto rounded-2xl bg-emerald-500/10 text-emerald-500 text-xs font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t("You are subscribed to Sovereign Infrastructure Updates!", "أنت مشترك الآن في تحديثات البنية التحتية السيادية!")}</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto">
              <Input
                type="email"
                placeholder={t("Enter your business email...", "أدخل بريدك الإلكتروني...")}
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="h-10 rounded-xl bg-background border-border/80 text-xs"
              />
              <Button type="submit" className="h-10 px-5 rounded-xl text-xs font-semibold shrink-0 gap-2">
                <span>{t("Subscribe", "اشتراك")}</span>
                {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </Button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
