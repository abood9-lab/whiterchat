import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { FloatingChat } from "./FloatingChat";
import {
  Home,
  Search,
  PlusSquare,
  MessageCircle,
  Heart,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  Clapperboard,
  Ghost,
  Brain,
  Users,
  Check,
  Plus,
  ShieldAlert,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useTheme } from "./theme-provider";
import { useEffect } from "react";
import { initSocket, disconnectSocket } from "@/lib/socket";
import { useNavigationState } from "@/lib/navigation-context";
import { CallOverlay } from "./chat/CallOverlay";
import { IncomingCallBanner } from "./chat/IncomingCallBanner";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, token, logout, accounts, switchAccount } = useAuth();
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const {
    showMobileBottomNav,
    hideMobileHeader,
    callState,
    endCall,
    isCallMinimized,
    setIsCallMinimized,
    setCallState,
  } = useNavigationState();

  useEffect(() => {
    if (token) {
      initSocket(token);
    } else {
      disconnectSocket();
    }
    return () => {
      disconnectSocket();
    };
  }, [token]);

  const isInstitutionalPage =
    location === "/privacy" ||
    location === "/terms" ||
    location === "/community-guidelines" ||
    location === "/safety" ||
    location === "/security" ||
    location.startsWith("/security/") ||
    location === "/help" ||
    location === "/faq" ||
    location === "/contact" ||
    location === "/report-problem" ||
    location === "/careers" ||
    location.startsWith("/careers/") ||
    location === "/about" ||
    location === "/press" ||
    location === "/status" ||
    location === "/creators" ||
    location === "/legal" ||
    location === "/cookies" ||
    location === "/copyright" ||
    location === "/accessibility" ||
    location === "/rules" ||
    location === "/business" ||
    location === "/advertising" ||
    location.startsWith("/admin");

  if (isInstitutionalPage) {
    return <>{children}</>;
  }

  if (!user) {
    const isAuthPage = location === "/login" || location === "/register" || location === "/setup-profile";
    if (isAuthPage) {
      return <>{children}</>;
    }

    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        {/* Guest Top Header */}
        <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
                <img src="/logo.png?v=3" alt="WhiterChat Logo" className="w-8 h-8 rounded-full object-cover shadow-sm ring-1 ring-border/40" />
                <span className="font-serif text-2xl sm:text-3xl font-bold italic tracking-tighter">
                  WhiterChat
                </span>
              </Link>
              <nav className="hidden sm:flex items-center gap-2">
                <Link
                  href="/"
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    location === "/" ? "bg-secondary text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Home
                </Link>
                <Link
                  href="/explore"
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    location === "/explore" ? "bg-secondary text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Explore
                </Link>
                <Link
                  href="/reels"
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    location === "/reels" ? "bg-secondary text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Reels
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-xl font-medium">
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild size="sm" className="rounded-xl font-semibold shadow-sm">
                <Link href="/register">Sign Up</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Guest Content */}
        <main className="flex-1 pb-24">{children}</main>

        {/* Guest Sticky Bottom Banner */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white py-3 px-4 shadow-xl">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <p className="font-bold text-sm sm:text-base">Don't miss what's happening right now</p>
              <p className="text-xs text-white/90 hidden sm:block">
                People on WhiterChat are the first to know. Sign up to like, comment, and connect.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button asChild variant="secondary" size="sm" className="rounded-xl font-semibold bg-white text-black hover:bg-white/90">
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild size="sm" className="rounded-xl font-semibold bg-black/40 hover:bg-black/60 text-white border border-white/20">
                <Link href="/register">Sign Up Free</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Search, label: "Explore", href: "/explore" },
    { icon: Clapperboard, label: "Reels", href: "/reels" },
    { icon: Ghost, label: "Snap", href: "/snap" },
    { icon: PlusSquare, label: "Create", href: "/create" },
    { icon: Brain, label: "AI Studio", href: "/ai" },
    { icon: Heart, label: "Notifications", href: "/notifications" },
    { icon: User, label: "Profile", href: `/profile/${user.username}` },
  ];

  const isMessagesActive = location === "/messages" || location.startsWith("/messages");

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border fixed h-full p-4 gap-4 bg-card z-50">
        <div className="px-4 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <img src="/logo.png?v=3" alt="WhiterChat Logo" className="w-8 h-8 rounded-full object-cover shadow-sm ring-1 ring-border/40" />
            <span className="font-serif text-2xl sm:text-3xl font-bold italic tracking-tighter">
              WhiterChat
            </span>
          </Link>
          <Link
            href="/messages"
            aria-label="Messages"
            className={cn(
              "p-2 rounded-lg transition-colors",
              isMessagesActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <MessageCircle className={cn("w-6 h-6", isMessagesActive && "fill-foreground")} />
          </Link>
        </div>
        <nav className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-lg text-base font-medium transition-all hover:bg-secondary",
                location === item.href || (item.href !== "/" && location.startsWith(item.href))
                  ? "font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-6 h-6", location === item.href && "fill-foreground")} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-2 pt-4 border-t border-border">
          {/* Multi-Account Quick Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left hover:bg-secondary transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="w-8 h-8 ring-1 ring-border shrink-0">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs font-bold bg-gradient-to-tr from-purple-500 to-pink-500 text-white">
                      {user.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 truncate">
                    <div className="text-xs font-semibold text-foreground truncate">
                      @{user.username}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {accounts.length > 1 ? `${accounts.length} accounts` : "Switch account"}
                    </div>
                  </div>
                </div>
                <Users className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
                Switch Account
              </DropdownMenuLabel>
              {accounts.map((acc) => {
                const isActive = acc.id === user.id;
                return (
                  <DropdownMenuItem
                    key={acc.id}
                    onClick={() => !isActive && switchAccount(acc.id)}
                    className={cn(
                      "flex items-center justify-between gap-2 cursor-pointer py-2",
                      isActive && "font-semibold"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="w-6 h-6 shrink-0">
                        <AvatarImage src={acc.avatarUrl || undefined} />
                        <AvatarFallback className="text-[10px] font-bold">
                          {acc.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate">@{acc.username}</span>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/settings?tab=multi-account"
                  className="flex items-center gap-2 text-xs cursor-pointer py-2 text-primary font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add or Manage Accounts</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {["superadmin", "admin", "moderator", "support"].includes((user as any).role) && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-lg text-base font-medium transition-all hover:bg-secondary text-destructive hover:text-destructive",
                location.startsWith("/admin") && "font-bold bg-destructive/10"
              )}
            >
              <ShieldAlert className="w-6 h-6" />
              <span>Admin Portal</span>
            </Link>
          )}

          <Link
            href="/settings?tab=plans"
            className={cn(
              "flex items-center gap-4 px-4 py-3 rounded-lg text-base font-medium transition-all hover:bg-secondary text-muted-foreground hover:text-foreground",
              location === "/plans" && "font-bold text-foreground"
            )}
          >
            <CreditCard className="w-6 h-6" />
            <span>Plans & Billing</span>
          </Link>

          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-4 px-4 py-3 rounded-lg text-base font-medium transition-all hover:bg-secondary text-muted-foreground hover:text-foreground",
              location === "/settings" && "font-bold text-foreground"
            )}
          >
            <Settings className="w-6 h-6" />
            <span>Settings</span>
          </Link>
          <Button
            variant="ghost"
            className="justify-start gap-4 px-4 py-3 h-auto text-base font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            <span>Theme</span>
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-4 px-4 py-3 h-auto text-base font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={logout}
          >
            <LogOut className="w-6 h-6" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 md:ml-64 md:pb-0 min-h-[100dvh]",
        (location === "/reels" || location.startsWith("/reels") || location.startsWith("/reel")) && "h-[100dvh] max-h-[100dvh] overflow-hidden",
        showMobileBottomNav ? "pb-[calc(4rem+env(safe-area-inset-bottom))]" : "pb-0"
      )}>
        {!hideMobileHeader && (
          <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-50">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <img src="/logo.png?v=3" alt="WhiterChat Logo" className="w-7 h-7 rounded-full object-cover shadow-sm ring-1 ring-border/40" />
              <span className="font-serif text-lg font-bold italic tracking-tighter">WhiterChat</span>
            </Link>
            <div className="flex items-center gap-2">
               <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>
                <Link
                  href="/messages"
                  aria-label="Messages"
                  className={cn(
                    "p-2 rounded-lg transition-colors inline-flex items-center justify-center",
                    isMessagesActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <MessageCircle className={cn("w-5 h-5", isMessagesActive && "fill-foreground")} />
                </Link>
            </div>
          </div>
        )}
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      {showMobileBottomNav && (
        <nav
          className="md:hidden fixed bottom-0 w-full bg-card border-t border-border flex items-center justify-around p-2 z-50 animate-in fade-in duration-200"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "p-3 rounded-xl transition-colors",
                location === item.href || (item.href !== "/" && location.startsWith(item.href))
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <item.icon className={cn("w-6 h-6", location === item.href && "fill-foreground")} />
            </Link>
          ))}
        </nav>
      )}

      {/* Incoming Call Notification Banner */}
      <IncomingCallBanner />

      {/* Global Call Overlay */}
      <CallOverlay
        callState={callState}
        onClose={endCall}
        myUserId={user?.id ?? ""}
        myUser={user}
        isMinimized={isCallMinimized}
        onMinimizedChange={setIsCallMinimized}
        onStatusChange={(status) => {
          setCallState((prev) => (prev ? { ...prev, status } : null));
        }}
      />

      {/* Floating chat bubble — shown on all pages except /messages and /snap */}
      <FloatingChat />
    </div>
  );
}
