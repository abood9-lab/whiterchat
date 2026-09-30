import { useState, useEffect } from "react";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { Activity, CheckCircle2, AlertTriangle, Clock, Server, RefreshCw, Cpu, Database, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api-url";

interface ServiceMetric {
  name: string;
  key: string;
  status: string;
  uptime: string;
  latencyMs: number;
  description: string;
}

interface Incident {
  id: string;
  title: string;
  date: string;
  impact: string;
  resolvedAt: string;
  summary: string;
}

export default function SystemStatusPage() {
  const { t, isRtl } = useI18n();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchStatus = () => {
    setLoading(true);
    fetch(apiUrl("/api/institutional/status"))
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setLastRefreshed(new Date());
      })
      .catch((err) => console.error("Failed to fetch status", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // 30s auto refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <InstitutionalLayout
      activeSection="status"
      pageTitle={t("Live System Status", "حالة النظام المباشرة")}
      pageSubtitle={t(
        "Real-time uptime, response latency, and operational telemetry for all WhiterChat infrastructure components.",
        "مراقبة مباشرة ومستمرة لتوافر الخدمات وزمن الاستجابة وكفاءة البنية التحتية لمنصة WhiterChat."
      )}
    >
      <SEOHead
        title={t("System Status & Live Uptime | WhiterChat Operations", "حالة النظام وتوافر الخدمات | عمليات WhiterChat")}
        description={t(
          "Monitor real-time system health, database latency, WebSocket connectivity, and incident reports for WhiterChat.",
          "تابع حالة الخوادم وقواعد البيانات وسرعة الاستجابة وسجل التحديثات التشغيلية لمنصة WhiterChat."
        )}
        canonicalPath="/status"
      />

      <div className="max-w-4xl mx-auto space-y-10">
        {/* Overall Status Banner */}
        <div className="p-8 rounded-3xl bg-card border border-emerald-500/30 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left rtl:sm:text-right">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {data?.overallStatus || t("All Systems Operational", "جميع الخدمات تعمل بكفاءة كاملة")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("Auto-refreshed every 30 seconds. Last checked:", "يتم التحديث تلقائيًا كل ٣٠ ثانية. آخر فحص:")}{" "}
                {lastRefreshed.toLocaleTimeString()}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={loading}
            className="rounded-xl gap-2 text-xs border-border"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{t("Refresh Metrics", "تحديث المؤشرات")}</span>
          </Button>
        </div>

        {/* System Component Breakdown */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              <span>{t("Core Infrastructure Services", "الخدمات والبنية التحتية")}</span>
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              {t("Target SLA: 99.9%", "المستهدف: 99.9%")}
            </span>
          </div>

          <div className="space-y-3">
            {data?.services?.map((svc: ServiceMetric, idx: number) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h4 className="font-bold text-sm text-foreground">{svc.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">{svc.description}</p>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground self-end sm:self-center">
                  <span className="bg-muted/60 px-2 py-0.5 rounded text-foreground font-semibold">
                    {svc.latencyMs}ms {t("latency", "استجابة")}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {svc.uptime}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Past Maintenance / Incident History */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <span>{t("Scheduled Maintenance & Past Incidents", "سجل الصيانة المجدولة والتحديثات")}</span>
          </h3>

          <div className="space-y-3">
            {data?.incidents?.map((inc: Incident) => (
              <div key={inc.id} className="p-5 rounded-2xl bg-muted/20 border border-border/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm">{inc.title}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold uppercase text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded">
                    {inc.impact}
                  </span>
                </div>
                <span className="text-muted-foreground block text-[11px]">{inc.date} • {inc.resolvedAt}</span>
                <p className="text-muted-foreground">{inc.summary}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </InstitutionalLayout>
  );
}
