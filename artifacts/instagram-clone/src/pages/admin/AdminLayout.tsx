import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/components/theme-provider";
import { adminApi } from "./admin-api";
import { ADMIN_STRINGS, type AdminLanguage } from "./admin-i18n";
import { AdminGlobalSearchModal } from "./AdminGlobalSearchModal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  FileText,
  Clapperboard,
  History,
  MessageSquare,
  ShieldCheck,
  ClipboardList,
  Settings,
  Search,
  Moon,
  Sun,
  LogOut,
  Menu,
  Languages,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Sparkles,
  BadgeCheck,
  CreditCard,
  Users2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface AdminContextType {
  admin: any;
  lang: AdminLanguage;
  setLang: (lang: AdminLanguage) => void;
  token: string | null;
  refreshMetrics: () => void;
}

export const AdminContext = createContext<AdminContextType>({
  admin: null,
  lang: "en",
  setLang: () => {},
  token: null,
  refreshMetrics: () => {},
});

export const useAdmin = () => useContext(AdminContext);

interface AdminLayoutProps {
  children: ReactNode | ((props: AdminContextType) => ReactNode);
  activeTab: string;
}

export function AdminLayout({ children, activeTab }: AdminLayoutProps) {
  const { user, token, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();

  const [lang, setLang] = useState<AdminLanguage>(() => {
    return (localStorage.getItem("whiterchat_admin_lang") as AdminLanguage) || "en";
  });

  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [canBootstrap, setCanBootstrap] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [metricsSummary, setMetricsSummary] = useState<{ pendingReports: number; pendingFeedback: number }>({
    pendingReports: 0,
    pendingFeedback: 0,
  });

  const t = ADMIN_STRINGS[lang];
  const isRtl = lang === "ar";

  const handleLanguageToggle = () => {
    const nextLang: AdminLanguage = lang === "en" ? "ar" : "en";
    setLang(nextLang);
    localStorage.setItem("whiterchat_admin_lang", nextLang);
  };

  const fetchAdminMe = async () => {
    if (!token) {
      setLoading(false);
      setUnauthorized(true);
      return;
    }

    try {
      setLoading(true);
      const data = await adminApi.getMe(token);
      setAdminProfile(data.admin);
      setUnauthorized(false);
      setCanBootstrap(false);

      // Also get lightweight metrics for sidebar badges
      try {
        const metricsData = await adminApi.getMetrics("today", token);
        if (metricsData?.metrics?.moderation) {
          setMetricsSummary({
            pendingReports: metricsData.metrics.moderation.pendingReports || 0,
            pendingFeedback: metricsData.metrics.moderation.pendingFeedback || 0,
          });
        }
      } catch {}
    } catch (err: any) {
      console.warn("Admin authorization check failed:", err.message);
      setUnauthorized(true);
      setCanBootstrap(true); // Allow bootstrap prompt if DB has no admins
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminMe();
  }, [token]);

  // Keyboard shortcut Cmd/Ctrl + K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClaimSuperAdmin = async () => {
    try {
      setBootstrapping(true);
      const res = await adminApi.bootstrapClaim(token);
      toast.success(res.message || "Superadmin granted!");
      await fetchAdminMe();
    } catch (err: any) {
      toast.error(err.message || "Failed to claim superadmin role");
    } finally {
      setBootstrapping(false);
    }
  };

  const navItems = [
    { id: "dashboard", label: t.dashboard, href: "/admin", icon: LayoutDashboard },
    { id: "users", label: t.users, href: "/admin/users", icon: Users },
    { id: "groups", label: t.groups, href: "/admin/groups", icon: Users2 },
    { id: "plans", label: (t as any).plans || "Plans & Monetization", href: "/admin/plans", icon: CreditCard },
    {
      id: "verification",
      label: t.verification,
      href: "/admin/verification",
      icon: BadgeCheck,
      badge: (metricsSummary as any).pendingVerification > 0 ? (metricsSummary as any).pendingVerification : undefined,
      badgeVariant: "destructive" as const,
    },
    {
      id: "reports",
      label: t.reports,
      href: "/admin/reports",
      icon: AlertTriangle,
      badge: metricsSummary.pendingReports > 0 ? metricsSummary.pendingReports : undefined,
      badgeVariant: "destructive" as const,
    },
    { id: "content", label: t.content, href: "/admin/content", icon: FileText },
    { id: "reels", label: t.reels, href: "/admin/reels", icon: Clapperboard },
    { id: "stories", label: t.stories, href: "/admin/stories", icon: History },
    { id: "comments", label: t.comments, href: "/admin/comments", icon: MessageSquare },
    {
      id: "feedback",
      label: t.feedback,
      href: "/admin/feedback",
      icon: MessageSquare,
      badge: metricsSummary.pendingFeedback > 0 ? metricsSummary.pendingFeedback : undefined,
      badgeVariant: "secondary" as const,
    },
    { id: "security", label: t.security, href: "/admin/security", icon: ShieldCheck },
    { id: "audit-logs", label: t.auditLogs, href: "/admin/audit-logs", icon: ClipboardList },
    { id: "settings", label: t.settings, href: "/admin/settings", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-muted-foreground">{t.loading}</p>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center" dir={isRtl ? "rtl" : "ltr"}>
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">{t.accessDenied}</h1>
        <p className="text-muted-foreground max-w-md mb-6 text-sm">
          {t.accessDeniedDesc}
        </p>

        {canBootstrap && (
          <div className="p-5 border border-primary/30 bg-primary/5 rounded-2xl max-w-md w-full mb-6 text-left">
            <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1.5">
              <Sparkles className="w-4 h-4" />
              {t.claimSuperAdmin}
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {t.claimSuperAdminDesc}
            </p>
            <Button
              onClick={handleClaimSuperAdmin}
              disabled={bootstrapping}
              className="w-full font-medium"
            >
              {bootstrapping ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              {t.claimButton}
            </Button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/" className="flex items-center gap-2">
              {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              {t.backToApp}
            </Link>
          </Button>
          <Button variant="ghost" onClick={logout} className="text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            {t.logout}
          </Button>
        </div>
      </div>
    );
  }

  const roleLabel =
    adminProfile?.role === "superadmin"
      ? t.superAdmin
      : adminProfile?.role === "admin"
      ? t.admin
      : adminProfile?.role === "moderator"
      ? t.moderator
      : t.support;

  return (
    <AdminContext.Provider value={{ admin: adminProfile, lang, setLang, token, refreshMetrics: fetchAdminMe }}>
      <div className="min-h-screen bg-background text-foreground flex flex-col antialiased" dir={isRtl ? "rtl" : "ltr"}>
        {/* Top Header */}
        <header className="sticky top-0 z-40 w-full h-16 border-b border-border bg-card/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Mobile Sheet Trigger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={isRtl ? "right" : "left"} className="w-72 p-0 flex flex-col">
              <SheetHeader className="p-4 border-b border-border">
                <SheetTitle className="flex items-center gap-2.5 text-left">
                  <img src="/logo.png?v=3" alt="Logo" className="w-7 h-7 rounded-full object-cover" />
                  <span className="font-serif text-lg font-bold italic tracking-tighter">WhiterChat Admin</span>
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <Badge
                          variant={item.badgeVariant}
                          className="h-5 min-w-5 px-1.5 flex items-center justify-center text-[10px] rounded-full"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
              <div className="p-4 border-t border-border">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                  {t.backToApp}
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo & Portal Badge */}
          <Link href="/admin" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <img src="/logo.png?v=3" alt="Logo" className="w-8 h-8 rounded-full object-cover shadow-sm ring-1 ring-border/40" />
            <div className="flex flex-col">
              <span className="font-serif text-lg font-bold italic tracking-tighter leading-tight">WhiterChat</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary leading-none">
                {t.adminPortal}
              </span>
            </div>
          </Link>
        </div>

        {/* Global Search Button */}
        <div className="flex-1 max-w-md hidden sm:block">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl border border-input bg-background/50 hover:bg-secondary/60 text-xs text-muted-foreground transition-colors shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <span>{t.search}</span>
            </div>
            <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2">
          {/* Mobile search trigger */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(true)}
            className="sm:hidden"
          >
            <Search className="w-4 h-4" />
          </Button>

          {/* Language Switcher */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLanguageToggle}
            className="h-8 px-2 text-xs font-semibold gap-1.5"
            title="Toggle English / Arabic"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{lang === "en" ? "عربي" : "EN"}</span>
          </Button>

          {/* Theme Switcher */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Return to Main App */}
          <Button variant="outline" size="sm" asChild className="hidden md:inline-flex h-8 text-xs gap-1.5">
            <Link href="/">
              {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              {t.backToApp}
            </Link>
          </Button>

          {/* Admin User Chip */}
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <Avatar className="w-8 h-8 ring-1 ring-primary/40">
              <AvatarImage src={adminProfile?.avatarUrl} />
              <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">
                {adminProfile?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold leading-tight text-foreground">
                @{adminProfile?.username}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Administrative Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="w-64 border-r border-border bg-card/50 hidden lg:flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group",
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "w-4 h-4 transition-transform group-hover:scale-110",
                        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <Badge
                      variant={item.badgeVariant}
                      className="h-5 min-w-5 px-1.5 flex items-center justify-center text-[10px] rounded-full"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Admin Role Status Card */}
          <div className="p-3 border-t border-border">
            <div className="p-2.5 rounded-xl bg-secondary/60 border border-border flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-foreground flex items-center gap-1 truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{roleLabel}</span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {adminProfile?.email}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                title={t.logout}
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-background">
          <div className="max-w-7xl mx-auto">
            {typeof children === "function"
              ? children({
                  admin: adminProfile,
                  lang,
                  setLang,
                  token,
                  refreshMetrics: fetchAdminMe,
                })
              : children}
          </div>
        </main>
      </div>

      {/* Global Search Modal */}
      <AdminGlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        lang={lang}
        token={token}
        onSelectUser={(id) => setLocation(`/admin/users?highlight=${id}`)}
        onSelectReport={(id) => setLocation(`/admin/reports?highlight=${id}`)}
        onSelectFeedback={(id) => setLocation(`/admin/feedback?highlight=${id}`)}
      />
    </div>
    </AdminContext.Provider>
  );
}
