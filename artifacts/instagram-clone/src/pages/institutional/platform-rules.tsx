import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { Scale, ShieldAlert, CheckCircle2, AlertOctagon, UserX, Ban, EyeOff } from "lucide-react";

export default function PlatformRulesPage() {
  const { t, isRtl } = useI18n();

  const rules = [
    {
      title: t("No Harassment or Hate Speech", "حظر التحرش وخطاب الكراهية"),
      desc: t(
        "Attacking, demeaning, or inciting hatred against individuals or groups based on protected traits is zero-tolerance.",
        "الهجوم أو الإساءة أو التحريض على الكراهية ضد أي شخص أو فئة مرفوض تمامًا ويؤدي للإيقاف."
      ),
    },
    {
      title: t("No Dangerous Organizations or Violence", "منع العنف والترويج للتنظيمات الإرهابية"),
      desc: t(
        "Content depicting, praising, or promoting terrorism, violent extremism, or armed conflict is prohibited.",
        "يُحظر نشر أو تمجيد العنف أو الإرهاب أو التنظيمات المتطرفة."
      ),
    },
    {
      title: t("No Non-Consensual Imagery or Explicit Adult Media", "حظر المحتوى الإباحي والصور غير الرضائية"),
      desc: t(
        "Explicit pornography and sharing intimate photographs without explicit permission results in permanent banning.",
        "المواد الإباحية الصريحة ونشر الصور الحميمية دون موافقة يعاقب عليه بالحظر النهائي."
      ),
    },
    {
      title: t("No Automated Botting or Platform Manipulation", "منع روبوتات التفاعل والتلاعب بالخوارزميات"),
      desc: t(
        "Deploying unauthorized scripts, automated scrapers, or mass fake engagement networks is strictly forbidden.",
        "يحظر تشغيل السكربتات الآلية أو تزييف المتابعين والإعجابات والتلاعب بالمنصة."
      ),
    },
  ];

  return (
    <InstitutionalLayout
      activeSection="rules"
      pageTitle={t("Platform Rules & Enforcement", "قواعد وضوابط المنصة")}
      pageSubtitle={t(
        "The explicit operating rules that define lawful, respectful, and safe participation across WhiterChat.",
        "القواعد والضوابط الصريحة المنظمة للمشاركة الآمنة والقانونية في جميع أنحاء المنصة."
      )}
    >
      <SEOHead
        title={t("Platform Rules & Standards | WhiterChat", "قواعد وضوابط المنصة | WhiterChat")}
        description={t(
          "Review WhiterChat's platform rules, safety policies, content moderation protocols, and account penalties.",
          "اطلع على قواعد الاستخدام وسياسات الأمان وإجراءات الإشراف والعقوبات في WhiterChat."
        )}
        canonicalPath="/rules"
      />

      <div className="max-w-4xl mx-auto space-y-8">
        <div className="grid sm:grid-cols-2 gap-4">
          {rules.map((rule, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-card border border-border/80 space-y-2">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary" />
                <span>{rule.title}</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{rule.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </InstitutionalLayout>
  );
}
