import { useState } from "react";
import { InstitutionalLayout } from "@/components/institutional/InstitutionalLayout";
import { SEOHead } from "@/components/SEOHead";
import { useI18n } from "@/lib/i18n";
import { Sparkles, Heart, Zap, Shield, Globe, ArrowRight, ArrowLeft, Award, Compass, Terminal, Cpu, Cloud, Smartphone, BookOpen, Layers, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AboutUsPage() {
  const { t, isRtl } = useI18n();
  const [activeTab, setActiveTab] = useState<"story" | "piwaic" | "vision">("story");

  const timelineEvents = [
    {
      titleEn: "Started learning programming",
      titleAr: "بدأت تعلم البرمجة",
      descEn: "About a year ago during high school (Tawjihi).",
      descAr: "قبل حوالي سنة خلال مرحلة التوجيهي.",
    },
    {
      titleEn: "Self-learning through YouTube",
      titleAr: "التعلم الذاتي عبر يوتيوب",
      descEn: "Relying fundamentally on YouTube as the primary learning source.",
      descAr: "الاعتماد بشكل أساسي على يوتيوب كمصدر رئيسي للتعلم.",
    },
    {
      titleEn: "Started building WhiterChat",
      titleAr: "بدء العمل على WhiterChat",
      descEn: "The major project I am currently working on with full dedication.",
      descAr: "المشروع الكبير الذي أعمل عليه الآن بكل تفانٍ.",
    },
    {
      titleEn: "Continued despite challenges",
      titleAr: "الاستمرار رغم المعيقات",
      descEn: "Pushing forward with persistence, learning, building, and trying again.",
      descAr: "المضي قدمًا بالإصرار، والتعلم، والبناء، والمحاولة تلو الأخرى.",
    },
    {
      titleEn: "Expanded the vision toward PIWAIC",
      titleAr: "توسيع الرؤية نحو PIWAIC",
      descEn: "A name chosen by chance during a Tawjihi class, growing into a broader vision.",
      descAr: "اسم تم اختظاره بالصدفة في حصة التوجيهي، ليصبح مظلة لرؤية أوسع.",
    },
    {
      titleEn: "Future: Build technology that reaches the world",
      titleAr: "المستقبل: بناء تقنية تصل للعالم",
      descEn: "Aiming to build globally competitive products originating from the Arab world.",
      descAr: "السعي لبناء منتجات تنافس عالمياً وتنطلق من العالم العربي.",
    },
  ];

  const coreValues = [
    {
      title: t("Persistence", "الإصرار"),
      desc: t("The defining trait of continuing to try, learn, and build regardless of obstacles.", "الصفة الأساسية التي تميز المحاولة المستمرة والتعلم والبناء بغض النظر عن التحديات."),
      icon: Zap,
    },
    {
      title: t("Learning", "التعلم المستمر"),
      desc: t("Self-driven education through accessible resources like YouTube and relentless practice.", "التعليم الذاتي المعتمد على المصادر المتاحة مثل يوتيوب والممارسة المستمرة."),
      icon: BookOpen,
    },
    {
      title: t("Building", "البناء والتطوير"),
      desc: t("Turning ideas into tangible, working software products with craftsmanship.", "تحويل الأفكار إلى منتجات برمجية حقيقية وفعالة بإتقان وشغف."),
      icon: Layers,
    },
    {
      title: t("Ambition", "الطموح"),
      desc: t("Aspiring to create Arabic technology capable of competing globally.", "السعي لبناء تقنية عربية قادرة على الوصول والمنافسة عالمياً."),
      icon: Sparkles,
    },
    {
      title: t("Arabic Innovation", "الابتكار العربي"),
      desc: t("Proving that Arab developers can build original solutions rather than just consuming.", "إثبات أن المطورين العرب قادرون على صناعة حلول أصلية وليس فقط استهلاكها."),
      icon: Globe,
    },
    {
      title: t("Global Vision", "الرؤية العالمية"),
      desc: t("Aiming for standards that match the strongest tech platforms worldwide.", "استهداف معايير تنافس أقوى المنصات التقنية على مستوى العالم."),
      icon: Compass,
    },
  ];

  const piwaicLetters = [
    { char: "P", meaning: t("No specific meaning currently assigned", "لا يوجد له معنى محدد حالياً"), color: "text-muted-foreground", desc: t("Kept open for future expansion.", "متروك للتوسع المستقبلي.") },
    { char: "I", meaning: "IDE", color: "text-blue-500", desc: t("Development environments & tools.", "بيئات التطوير والأدوات البرمجية.") },
    { char: "W", meaning: "Workspace", color: "text-emerald-500", desc: t("Collaborative workspaces & platforms.", "مساحات العمل التعاونية والمنصات.") },
    { char: "A", meaning: "AI", color: "text-purple-500", desc: t("Artificial intelligence & smart features.", "الذكاء الاصطناعي والقدرات الذكية.") },
    { char: "I", meaning: "iOS", color: "text-cyan-500", desc: t("Mobile experiences & applications.", "تجارب وتطبيقات الهواتف الذكية.") },
    { char: "C", meaning: "Cloud", color: "text-amber-500", desc: t("Cloud infrastructure & scalability.", "البنية السحابية وقابلية التوسع.") },
  ];

  return (
    <InstitutionalLayout
      activeSection="about"
      pageTitle={t("The Story Behind WhiterChat", "قصة وراء WhiterChat")}
      pageSubtitle={t(
        "From learning by myself to building something I believe can reach the world.",
        "من التعلم الذاتي بمفردي إلى بناء شيء أؤمن بأنه قادر على الوصول إلى العالم."
      )}
    >
      <SEOHead
        title={t("The Story Behind WhiterChat | WhiterChat", "قصة وراء WhiterChat | WhiterChat")}
        description={t(
          "Discover the real story behind WhiterChat, founded by Abdalrhman AL-mofleh. A journey of self-learning, persistence, and Arab innovation.",
          "اكتشف القصة الحقيقية وراء منصة WhiterChat التي أسسها عبد الرحمن المفلح. رحلة من التعلم الذاتي، الإصرار، والابتكار العربي."
        )}
        canonicalPath="/about"
      />

      <div className="max-w-4xl mx-auto space-y-20 py-6">
        {/* HERO SECTION */}
        <section className="text-center space-y-6 relative overflow-hidden p-8 sm:p-14 rounded-3xl bg-gradient-to-b from-primary/5 via-card to-card border border-border/80 shadow-sm">
          <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t("The Story Behind WhiterChat", "قصة المشروع")}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
            {t("The Story Behind WhiterChat", "قصة وراء WhiterChat")}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t(
              "A journey that started with learning, persistence, and a belief that Arabic innovation can reach the world.",
              "رحلة بدأت بالتعلم والإصرار والإيمان بأن الابتكار العربي قادر على الوصول إلى العالم."
            )}
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Button
              variant={activeTab === "story" ? "default" : "outline"}
              onClick={() => setActiveTab("story")}
              className="rounded-xl text-xs font-semibold"
            >
              {t("The Journey & Founder", "الرحلة والمؤسس")}
            </Button>
            <Button
              variant={activeTab === "piwaic" ? "default" : "outline"}
              onClick={() => setActiveTab("piwaic")}
              className="rounded-xl text-xs font-semibold"
            >
              {t("PIWAIC Vision", "رؤية PIWAIC")}
            </Button>
            <Button
              variant={activeTab === "vision" ? "default" : "outline"}
              onClick={() => setActiveTab("vision")}
              className="rounded-xl text-xs font-semibold"
            >
              {t("Future & Beyond", "المستقبل والرؤية")}
            </Button>
          </div>
        </section>

        {/* FOUNDER SECTION */}
        <section className="p-8 sm:p-10 rounded-3xl bg-card border border-border/80 shadow-sm grid md:grid-cols-3 gap-8 items-center">
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4">
            <div className="w-28 h-28 rounded-2xl bg-muted border border-border flex items-center justify-center shadow-inner overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <span className="font-serif text-3xl font-bold text-primary italic">AA</span>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Abdalrhman AL-mofleh</h2>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Founder & Developer</p>
            </div>
          </div>
          <div className="md:col-span-2 space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              {t(
                "I started learning programming while in high school (Tawjihi) about a year ago, relying fundamentally on YouTube as my primary source of learning.",
                "بدأت تعلم البرمجة وأنا في مرحلة التوجيهي قبل حوالي سنة، واعتمدت بشكل أساسي على YouTube في التعلم."
              )}
            </p>
            <p>
              {t(
                "WhiterChat is the major project I am currently working on with full dedication. The trait that defines me the most is persistence, and my primary motivation to keep going is my ambition and desire to build something Arabic that reaches the world.",
                "WhiterChat هو المشروع الكبير الذي أعمل عليه الآن. أكثر صفة أعتبرها تميزني هي الإصرار، والدافع الأساسي للاستمرار هو طموحي ورغبتي في بناء شيء عربي يصل إلى العالم."
              )}
            </p>
          </div>
        </section>

        {/* WHERE IT STARTED & WHY WHITERCHAT */}
        <div className="grid md:grid-cols-2 gap-8">
          <section className="p-8 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
            <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary">
              <Compass className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{t("Where It Started", "البداية")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(
                "I started learning programming during Tawjihi, and through self-learning via YouTube, my journey began. It didn't start from a huge company or a large team. It started with learning, trying, and persisting.",
                "بدأت تعلم البرمجة وأنا في التوجيهي، ومن خلال التعلم الذاتي عبر YouTube بدأت رحلتي. لم تكن البداية من شركة ضخمة أو فريق كبير، بل كانت بالتعلم والمحاولة والاستمرار."
              )}
            </p>
          </section>

          <section className="p-8 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
            <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{t("Why WhiterChat?", "لماذا WhiterChat؟")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(
                "The idea of WhiterChat started from a feeling that Arab participation in the tech world needs a stronger presence. I wanted to build something Arabic, not just use products built by others. I want WhiterChat to be an example that Arab ideas can build products that reach the world.",
                "بدأت فكرة WhiterChat من شعوري بأن المشاركة العربية في عالم التقنية تحتاج إلى حضور أكبر. أردت أن أبني شيئًا عربيًا، وليس فقط أن أستخدم المنتجات التي بناها الآخرون. أريد أن يكون WhiterChat مثالًا على أن الأفكار العربية يمكنها بناء منتجات تصل إلى العالم."
              )}
            </p>
          </section>
        </div>

        {/* BUILT THROUGH CHALLENGES & THE VISION */}
        <div className="grid md:grid-cols-2 gap-8">
          <section className="p-8 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
            <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary">
              <Zap className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{t("Built Through Challenges", "البناء عبر التحديات")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(
                "The most important thing I consider an achievement so far is that I am still trying, learning, and building despite all obstacles. It is all about persistence, learning, building, and trying again.",
                "أهم شيء أعتبره إنجازًا حتى الآن هو أنني ما زلت أحاول وأتعلم وأبني رغم كل المعيقات. الأساس هو الإصرار، والتعلم، والبناء، والمحاولة تلو الأخرى."
              )}
            </p>
          </section>

          <section className="p-8 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
            <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary">
              <Globe className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{t("The Vision", "الرؤية")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(
                "I want WhiterChat to reach a level capable of competing with the strongest global tech companies and platforms. I want this journey to be proof that Arabs are also capable of building technologies and products that reach the world.",
                "أريد أن يصل WhiterChat إلى مستوى قادر على منافسة أقوى الشركات والمنصات التقنية عالميًا، وأن تكون هذه الرحلة دليلًا على أن العرب قادرون على بناء تقنيات ومنتجات تصل إلى العالم."
              )}
            </p>
          </section>
        </div>

        {/* MORE THAN A PLATFORM & FOUNDER QUOTE */}
        <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 border border-border shadow-sm space-y-8">
          <div className="max-w-2xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              {t("More Than a Platform", "أكثر من مجرد منصة")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {t("A Bigger Idea", "فكرة أكبر")}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(
                "WhiterChat is not just a social platform for me. It is part of a bigger idea: that success in technology is not restricted to a specific region or people. Arabs are capable of learning. Arabs are capable of building. Arabs are capable of innovating. And Arab ideas are capable of reaching the world.",
                "WhiterChat بالنسبة لي ليس مجرد منصة اجتماعية، بل هو جزء من فكرة أكبر: أن النجاح في التقنية ليس حكرًا على جهة أو شعب. العرب قادرون على التعلم، قادرون على البناء، قادرون على الابتكار، والأفكار العربية قادرة على الوصول إلى العالم."
              )}
            </p>
          </div>

          {/* Founder Quote Highlight */}
          <div className="p-6 sm:p-8 rounded-2xl bg-background/80 border border-primary/30 relative shadow-md">
            <div className="absolute -top-3 right-8 px-3 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold uppercase rounded-full">
              {t("Founder Quote", "مقولة المؤسس")}
            </div>
            <blockquote className="font-serif italic text-lg sm:text-xl text-foreground text-center leading-relaxed">
              "{t(
                "أنا مطور عربي بدأت من الصفر، وما زلت أتعلم وأبني لأثبت أن الأفكار العربية قادرة توصل للعالم.",
                "أنا مطور عربي بدأت من الصفر، وما زلت أتعلم وأبني لأثبت أن الأفكار العربية قادرة توصل للعالم."
              )}"
            </blockquote>
          </div>
        </section>

        {/* TIMELINE SECTION */}
        <section className="p-8 sm:p-10 rounded-3xl bg-card border border-border/80 shadow-sm space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{t("Journey Timeline", "محطات الرحلة")}</h2>
            <p className="text-xs text-muted-foreground">{t("Step by step from the beginning toward the vision", "خطوة بخطوة من البداية نحو الرؤية")}</p>
          </div>

          <div className="relative border-s border-border ms-4 sm:ms-8 space-y-8 py-2">
            {timelineEvents.map((item, idx) => (
              <div key={idx} className="relative ps-6 sm:ps-8">
                <div className="absolute -start-[9px] top-1.5 w-4 h-4 rounded-full bg-primary ring-4 ring-background" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-primary">
                    {idx === 0 ? t("About a year ago", "قبل حوالي سنة") : idx === 1 ? t("Self-learning", "التعلم الذاتي") : idx === 2 ? t("Creation", "التأسيس") : idx === 3 ? t("Persistence", "الإصرار") : idx === 4 ? t("Evolution", "التوسع") : t("Future", "المستقبل")}
                  </span>
                  <h3 className="font-bold text-base text-foreground">{isRtl ? item.titleAr : item.titleEn}</h3>
                  <p className="text-xs text-muted-foreground">{isRtl ? item.descAr : item.descEn}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CORE VALUES CARDS */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{t("Core Values", "القيم الأساسية")}</h2>
            <p className="text-xs text-muted-foreground">{t("Principles guiding the journey", "المبادئ التي توجه الرحلة")}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coreValues.map((val, idx) => {
              const Icon = val.icon;
              return (
                <div key={idx} className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3 hover:border-primary/40 transition-colors">
                  <div className="p-2.5 w-fit rounded-xl bg-primary/10 text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">{val.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{val.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* PIWAIC SECTION */}
        <section className="p-8 sm:p-12 rounded-3xl bg-card border border-border/80 shadow-sm space-y-8">
          <div className="max-w-2xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              {t("Parent Vision", "الرؤية الأم")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">PIWAIC</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(
                "The company name is PIWAIC. The name was chosen by chance during one of the Tawjihi classes. With the expansion of ideas and projects, the name came to represent a broader vision: a growing technology vision built around software, AI, cloud, and developer-focused products.",
                "اسم الشركة هو PIWAIC. تم اختيار الاسم بالصدفة أثناء إحدى حصص التوجيهي. ومع توسع الأفكار والمشاريع، أصبح الاسم يمثل رؤية أكبر: رؤية تكنولوجية متنامية مبنية حول البرمجيات، والذكاء الاصطناعي، والسحاب، والمنتجات الموجهة للمطورين."
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {piwaicLetters.map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-muted/50 border border-border flex flex-col items-center text-center space-y-2">
                <span className={`text-2xl font-black ${item.color}`}>{item.char}</span>
                <span className="font-bold text-xs text-foreground">{item.meaning}</span>
                <span className="text-[10px] text-muted-foreground">{item.desc}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-start">
              <h4 className="font-bold text-sm text-foreground">{t("WhiterChat + PIWAIC", "علاقة WhiterChat بـ PIWAIC")}</h4>
              <p className="text-xs text-muted-foreground">{t("WhiterChat: Part of the broader PIWAIC vision.", "WhiterChat: جزء من رؤية PIWAIC الأوسع.")}</p>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-semibold">
              {t("Ecosystem Part", "جزء من المنظومة")}
            </span>
          </div>
        </section>

        {/* FOUNDER MESSAGE & WHAT COMES NEXT */}
        <div className="grid md:grid-cols-2 gap-8">
          <section className="p-8 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-foreground">{t("A Message from the Founder", "رسالة من المؤسس")}</h2>
            <blockquote className="text-xs text-muted-foreground italic leading-relaxed">
              "{t(
                "لم أبدأ من شركة كبيرة أو من فريق ضخم. بدأت بالتعلم، وبمحاولات كثيرة، وما زلت أحاول حتى اليوم. طموحي هو أن أبني شيئًا عربيًا يستطيع الوصول إلى العالم، وأن أثبت أن العرب قادرون على صناعة التكنولوجيا والمنافسة في هذا المجال.",
                "لم أبدأ من شركة كبيرة أو من فريق ضخم. بدأت بالتعلم، وبمحاولات كثيرة، وما زلت أحاول حتى اليوم. طموحي هو أن أبني شيئًا عربيًا يستطيع الوصول إلى العالم، وأن أثبت أن العرب قادرون على صناعة التكنولوجيا والمنافسة في هذا المجال."
              )}"
            </blockquote>
          </section>

          <section className="p-8 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-foreground">{t("What Comes Next", "ما الذي ينتظرنا مستقبلاً؟")}</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(
                "The long-term goal is to build products capable of competing globally, without stopping at a single product. The journey is still being written.",
                "الهدف على المدى البعيد هو بناء منتجات قادرة على المنافسة عالميًا، وليس التوقف عند منتج واحد. الرحلة ما زالت تُكتب."
              )}
            </p>
          </section>
        </div>

        {/* FINAL MESSAGE */}
        <section className="text-center p-10 rounded-3xl bg-gradient-to-t from-primary/10 to-card border border-primary/20 shadow-sm space-y-4">
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            {t("The journey is still being written.", "الرحلة ما زالت تُكتب.")}
          </h2>
          <p className="text-sm font-medium text-muted-foreground">
            {t("WhiterChat is not the destination. It is part of the journey.", "WhiterChat ليس الوجهة النهائية، بل هو جزء من الرحلة.")}
          </p>
        </section>
      </div>
    </InstitutionalLayout>
  );
}

