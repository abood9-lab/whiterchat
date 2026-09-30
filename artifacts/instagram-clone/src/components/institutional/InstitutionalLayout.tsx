import React from "react";
import { Link, useLocation } from "wouter";
import {
  Compass,
  Film,
  Sparkles,
  Shield,
  HelpCircle,
  Briefcase,
  Globe,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Layers,
  HeartHandshake,
  CheckCircle2,
  Lock,
  MessageSquare,
  FileText,
  AlertTriangle,
  Activity,
  Send,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { CookieConsentBanner } from "./CookieConsentBanner";

interface InstitutionalLayoutProps {
  children: React.ReactNode;
  activeSection?:
    | "about"
    | "privacy"
    | "terms"
    | "guidelines"
    | "safety"
    | "security"
    | "help"
    | "faq"
    | "contact"
    | "careers"
    | "press"
    | "status"
    | "creators"
    | "legal"
    | "cookies"
    | "copyright"
    | "accessibility"
    | "rules"
    | "business"
    | "advertising";
  pageTitle?: string;
  pageSubtitle?: string;
}

export function InstitutionalLayout({
  children,
  activeSection,
  pageTitle,
  pageSubtitle,
}: InstitutionalLayoutProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { lang, setLang, toggleLang, isRtl, t } = useI18n();

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary"
    >
      {/* ── Institutional Top Navigation Header ──────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Tag */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 p-0.5 shadow-md group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-background rounded-[10px] flex items-center justify-center">
                  <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 text-lg">
                    W
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight leading-tight group-hover:text-primary transition-colors">
                  WhiterChat
                </span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  {t("Corporate & Trust", "المؤسسة والأمان")}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Link
                href="/about"
                className={`px-3 py-1.5 rounded-lg transition-colors hover:text-foreground ${
                  activeSection === "about" ? "text-primary bg-primary/10 font-semibold" : ""
                }`}
              >
                {t("About", "عن المنصة")}
              </Link>
              <Link
                href="/safety"
                className={`px-3 py-1.5 rounded-lg transition-colors hover:text-foreground ${
                  activeSection === "safety" ? "text-primary bg-primary/10 font-semibold" : ""
                }`}
              >
                {t("Safety", "مركز الأمان")}
              </Link>
              <Link
                href="/help"
                className={`px-3 py-1.5 rounded-lg transition-colors hover:text-foreground ${
                  activeSection === "help" ? "text-primary bg-primary/10 font-semibold" : ""
                }`}
              >
                {t("Help Center", "مركز المساعدة")}
              </Link>
              <Link
                href="/careers"
                className={`px-3 py-1.5 rounded-lg transition-colors hover:text-foreground ${
                  activeSection === "careers" ? "text-primary bg-primary/10 font-semibold" : ""
                }`}
              >
                {t("Careers", "الوظائف")}
              </Link>
              <Link
                href="/status"
                className={`px-3 py-1.5 rounded-lg transition-colors hover:text-foreground ${
                  activeSection === "status" ? "text-primary bg-primary/10 font-semibold" : ""
                }`}
              >
                {t("Status", "حالة النظام")}
              </Link>
              <Link
                href="/legal"
                className={`px-3 py-1.5 rounded-lg transition-colors hover:text-foreground ${
                  activeSection === "legal" ? "text-primary bg-primary/10 font-semibold" : ""
                }`}
              >
                {t("Legal", "المركز القانوني")}
              </Link>
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Language Switcher Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLang}
              className="gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-lg border-border/80"
              title={t("Switch to Arabic", "التبديل إلى الإنجليزية")}
            >
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>{lang === "en" ? "العربية" : "English"}</span>
            </Button>

            {/* App Entry Points */}
            {user ? (
              <Button
                size="sm"
                onClick={() => setLocation("/")}
                className="h-8 px-3.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground"
              >
                {t("Go to Feed", "الانتقال للتطبيق")}
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/login")}
                  className="h-8 px-3 text-xs font-semibold"
                >
                  {t("Log In", "تسجيل الدخول")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setLocation("/register")}
                  className="h-8 px-3.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground shadow-sm"
                >
                  {t("Sign Up", "إنشاء حساب")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Optional Hero Banner ────────────────────────────────────────────── */}
      {pageTitle && (
        <div className="bg-gradient-to-b from-primary/5 via-muted/30 to-background border-b border-border/50 py-10 sm:py-14 px-4">
          <div className="max-w-5xl mx-auto text-center space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {pageTitle}
            </h1>
            {pageSubtitle && (
              <p className="max-w-2xl mx-auto text-sm sm:text-base text-muted-foreground leading-relaxed">
                {pageSubtitle}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Main Content Container ────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {children}
      </main>

      {/* ── Master Institutional Footer ────────────────────────────────────── */}
      <footer className="w-full border-t border-border bg-card/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          {/* Top Footer Grid: Informational Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Col 1: Company */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                {t("Company", "الشركة")}
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link href="/about" className="hover:text-foreground transition-colors">
                    {t("About WhiterChat", "عن WhiterChat")}
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-foreground transition-colors font-medium text-primary">
                    {t("The Story Behind WhiterChat", "قصة وراء WhiterChat")}
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-foreground transition-colors">
                    PIWAIC
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="hover:text-foreground transition-colors flex items-center gap-1">
                    <span>{t("Careers / Jobs", "الوظائف والفرص")}</span>
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-semibold">
                      {t("Hiring", "نوظف")}
                    </span>
                  </Link>
                </li>
                <li>
                  <Link href="/press" className="hover:text-foreground transition-colors">
                    {t("Press", "الصحافة")}
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-foreground transition-colors">
                    {t("Contact", "اتصل بنا")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 2: Help & Resources */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                {t("Help & Resources", "المساعدة والموارد")}
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link href="/help" className="hover:text-foreground transition-colors">
                    {t("Help Center", "مركز المساعدة")}
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-foreground transition-colors">
                    {t("FAQ", "الأسئلة الشائعة")}
                  </Link>
                </li>
                <li>
                  <Link href="/feedback" className="hover:text-foreground transition-colors">
                    {t("Feedback", "الملاحظات والآراء")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Safety */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                {t("Safety", "الأمان والسلامة")}
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link href="/safety" className="hover:text-foreground transition-colors">
                    {t("Safety Center", "مركز الأمان")}
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="hover:text-foreground transition-colors">
                    {t("Security", "الحماية والأمان")}
                  </Link>
                </li>
                <li>
                  <Link href="/report-problem" className="hover:text-foreground transition-colors">
                    {t("Report a Problem", "الإبلاغ عن مشكلة")}
                  </Link>
                </li>
                <li>
                  <Link href="/security/disclosure" className="hover:text-foreground transition-colors">
                    {t("Responsible Disclosure", "الإفصاح المسؤول")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Legal */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                {t("Legal", "الشؤون القانونية")}
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link href="/privacy" className="hover:text-foreground transition-colors">
                    {t("Privacy Policy", "سياسة الخصوصية")}
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-foreground transition-colors">
                    {t("Terms of Service", "شروط الاستخدام")}
                  </Link>
                </li>
                <li>
                  <Link href="/community-guidelines" className="hover:text-foreground transition-colors">
                    {t("Community Guidelines", "إرشادات المجتمع")}
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="hover:text-foreground transition-colors">
                    {t("Cookies Policy", "سياسة الكوكيز")}
                  </Link>
                </li>
                <li>
                  <Link href="/copyright" className="hover:text-foreground transition-colors">
                    {t("Copyright", "حقوق الطبع والنشر")}
                  </Link>
                </li>
                <li>
                  <Link href="/accessibility" className="hover:text-foreground transition-colors">
                    {t("Accessibility", "إمكانية الوصول")}
                  </Link>
                </li>
                <li>
                  <Link href="/legal" className="hover:text-foreground transition-colors">
                    {t("Legal Center", "المركز القانوني")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Footer Bar: Dynamic Copyright & Language */}
          <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-foreground">WhiterChat</span>
              <span>© {new Date().getFullYear()} WhiterChat. All rights reserved.</span>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={toggleLang}
                className="flex items-center gap-1 hover:text-foreground transition-colors font-medium"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "English (US)" : "العربية"}</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Cookie Consent Banner */}
      <CookieConsentBanner />
    </div>
  );
}
