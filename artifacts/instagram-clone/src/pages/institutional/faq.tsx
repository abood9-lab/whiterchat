import { useState } from "react";
import { Link } from "wouter";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { HelpCircle, ChevronDown, Search, MessageSquare, Shield, Smartphone, Sparkles, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function FAQPage() {
  const { t, isRtl } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: t("Is WhiterChat completely free to use?", "هل استخدام منصة WhiterChat مجاني بالكامل؟"),
      a: t(
        "Yes, WhiterChat is 100% free for all standard user and creator accounts. You can upload high-definition photos, share Reels, chat in real-time, publish 24-hour stories and notes, and use AI assistant tools without any subscription fees.",
        "نعم، استخدام WhiterChat مجاني بالكامل لجميع المستخدمين وصناع المحتوى؛ يشمل ذلك رفع الصور ومقاطع الريلز والمحادثات المباشرة والقصص اليومية والمساعد الذكي دون أي رسوم."
      ),
      category: "general",
    },
    {
      q: t("How does account email verification work?", "كيف يعمل نظام تفعيل الحساب وتأكيد البريد الإلكتروني؟"),
      a: t(
        "When creating an account, our backend generates a secure 6-digit numeric OTP and dispatches it via SMTP to your provided email address. Entering this OTP completes your email verification and activates your profile.",
        "عند التسجيل، يُنشئ الخادم رمز تحقق سري من ٦ أرقام ويُرسله لبريدك الإلكتروني، وبإدخال الرمز يتم تفعيل حسابك مباشرة."
      ),
      category: "account",
    },
    {
      q: t("Can I make my profile private so only friends see my posts?", "هل يمكنني جعل حسابي خاصًا ليقتصر على الأصدقاء فقط؟"),
      a: t(
        "Absolutely. In Settings > Privacy, you can toggle Private Account on. When enabled, users must send a follow request which you can accept or decline before they can see your posts, stories, or reels.",
        "بالتأكيد. يمكنك من خلال الإعدادات > الخصوصية تفعيل 'الحساب الخاص'. وبذلك يتوجب على المستخدمين إرسال طلب متابعة للموافقة عليه قبل رؤية محتواك."
      ),
      category: "privacy",
    },
    {
      q: t("What video formats and aspect ratios are supported for Reels?", "ما هي صيغ الفيديو وأبعاد العرض المدعومة في الريلز؟"),
      a: t(
        "WhiterChat supports MP4, WebM, and MOV formats up to 100MB. The optimal aspect ratio for Reels is 9:16 vertical portrait (1080x1920) up to 90 seconds in duration.",
        "تدعم المنصة صيغ MP4 وWebM وMOV حتى حجم 100MB. والأبعاد المثالية هي 9:16 العمودية (1080x1920) حتى 90 ثانية."
      ),
      category: "media",
    },
    {
      q: t("How does the AI Assistant work and is my data private?", "كيف يعمل مساعد الذكاء الاصطناعي وهل بياناتي محمية؟"),
      a: t(
        "The AI Assistant uses server-side Google Gemini models to assist you with creative writing, caption drafting, and hashtag recommendations. Your personal prompts are processed ephemerally on the backend and are never sold or used for ad targeting.",
        "يعمل المساعد الذكي بنماذج Google Gemini لمساعدتك في كتابة الأوصاف واقتراح الأفكار الإبداعية. وتُعالج نصوصك بأمان وسرية تامة دون بيعها أو استخدامها للإعلانات."
      ),
      category: "ai",
    },
    {
      q: t("How do I report harassing or abusive content?", "كيف أقوم بالإبلاغ عن محتوى مسيء أو حساب منتحل؟"),
      a: t(
        "Click the three dots (•••) on any post, reel, comment, or user profile, and select 'Report'. You can choose the exact violation reason. Our trust and safety team will review and resolve it promptly.",
        "اضغط على أيقونة الخيارات (•••) على أي منشور أو قصة أو حساب، واختر 'إبلاغ' وحدد السبب وسيقوم فريق الأمان بالتحقيق الفوري."
      ),
      category: "safety",
    },
  ];

  const filtered = faqs.filter(
    (f) =>
      !searchTerm.trim() ||
      f.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.a.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <InstitutionalLayout
      activeSection="faq"
      pageTitle={t("Frequently Asked Questions", "الأسئلة الشائعة")}
      pageSubtitle={t(
        "Instant answers to common questions about WhiterChat features, verification, privacy controls, and media sharing.",
        "إجابات فورية وشاملة عن أكثر الأسئلة شيوعًا حول ميزات WhiterChat والتحقق والخصوصية ومشاركة الوسائط."
      )}
    >
      <SEOHead
        title={t("Frequently Asked Questions (FAQ) | WhiterChat", "الأسئلة الشائعة | منصة WhiterChat")}
        description={t(
          "Find quick answers to questions regarding WhiterChat account verification, privacy controls, Reels, AI features, and safety guidelines.",
          "اعثر على إجابات سريعة ومباشرة حول تفعيل الحساب والخصوصية والريلز والذكاء الاصطناعي في WhiterChat."
        )}
        canonicalPath="/faq"
      />

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 rtl:right-3.5 rtl:left-auto top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("Filter questions by keyword...", "ابحث في الأسئلة الشائعة...")}
            className="pl-11 rtl:pr-11 rtl:pl-4 h-12 rounded-2xl bg-card border-border shadow-sm text-sm"
          />
        </div>

        {/* Accordion FAQ List */}
        <div className="space-y-3">
          {filtered.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-card border border-border/80 shadow-sm overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left rtl:text-right flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-foreground hover:bg-muted/30 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3 animate-in fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Support Link */}
        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">
            {t("Have a specific question not answered here?", "لديك سؤال محدد لم تجد إجابته هنا؟")}{" "}
            <Link href="/contact" className="text-primary font-semibold underline underline-offset-2">
              {t("Ask our support team directly", "تواصل مع فريق الدعم الفني")}
            </Link>
          </p>
        </div>
      </div>
    </InstitutionalLayout>
  );
}
