import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  User,
  Shield,
  KeyRound,
  Lock,
  MessageSquare,
  EyeOff,
  Bell,
  Palette,
  Globe,
  Download,
  Folder,
  Archive,
  History,
  TrendingUp,
  Clapperboard,
  Sparkles,
  ShieldOff,
  ChevronRight,
  ChevronLeft,
  Search,
  LogOut,
  AlertTriangle,
  FileText,
  X,
  Users,
  LifeBuoy,
  BadgeCheck,
  CreditCard,
} from "lucide-react";

// Sub-components
import { EditProfileSection } from "@/components/settings/EditProfileSection";
import { PlansBillingSection } from "@/components/settings/PlansBillingSection";
import { PersonalInfoSection } from "@/components/settings/PersonalInfoSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { PrivacySection } from "@/components/settings/PrivacySection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { MessagesSection } from "@/components/settings/MessagesSection";
import { ContentPreferencesSection } from "@/components/settings/ContentPreferencesSection";
import { BlockedMutedRestrictedSection } from "@/components/settings/BlockedMutedRestrictedSection";
import { YourActivitySection } from "@/components/settings/YourActivitySection";
import { SavedCollectionsSection } from "@/components/settings/SavedCollectionsSection";
import { ArchiveSection } from "@/components/settings/ArchiveSection";
import { StoriesNotesSettingsSection } from "@/components/settings/StoriesNotesSettingsSection";
import { ReelsMediaSection } from "@/components/settings/ReelsMediaSection";
import { LanguageAccessibilitySection } from "@/components/settings/LanguageAccessibilitySection";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { DataExportSection } from "@/components/settings/DataExportSection";
import { CreatorDashboardSection } from "@/components/settings/CreatorDashboardSection";
import { AccountActionsSection } from "@/components/settings/AccountActionsSection";
import { MultiAccountSection } from "@/components/settings/MultiAccountSection";
import { FeedbackCenterSection } from "@/components/settings/FeedbackCenterSection";
import { VerificationSection } from "@/components/settings/VerificationSection";
import { PwaSection } from "@/components/settings/PwaSection";
import { InstallPwaModal } from "@/components/InstallPwaModal";

export type SettingsTab =
  | "profile"
  | "plans"
  | "verification"
  | "personal"
  | "multi-account"
  | "pwa"
  | "creator"
  | "security"
  | "privacy"
  | "notifications"
  | "messages"
  | "content"
  | "safety"
  | "stories"
  | "reels"
  | "saved"
  | "archive"
  | "activity"
  | "appearance"
  | "language"
  | "export"
  | "feedback"
  | "account";

interface SettingItem {
  id: SettingsTab;
  label: string;
  desc: string;
  icon: React.ElementType;
  keywords: string[];
}

interface SettingGroup {
  groupTitle: string;
  items: SettingItem[];
}

const SETTINGS_GROUPS: SettingGroup[] = [
  {
    groupTitle: "Account & Profile",
    items: [
      {
        id: "profile",
        label: "Edit Profile",
        desc: "Name, username, bio, banner, avatar & custom links",
        icon: User,
        keywords: ["profile", "bio", "avatar", "photo", "username", "cover", "banner", "links", "pronouns"],
      },
      {
        id: "plans",
        label: "Plans & Subscriptions",
        desc: "Free, Pro, VIP, or Business: upgrade capabilities, quotas & billing",
        icon: CreditCard,
        keywords: ["subscription", "pro", "vip", "business", "plan", "upgrade", "billing", "pricing", "limits", "quota"],
      },
      {
        id: "verification",
        label: "Verification & Badges",
        desc: "Request official verification badge, choose subscription plan & manual payment",
        icon: BadgeCheck,
        keywords: ["verification", "verified", "badge", "check", "blue check", "gold badge", "plans", "payment"],
      },
      {
        id: "multi-account",
        label: "Add & Switch Accounts",
        desc: "Manage multiple accounts, add existing account & quick switch",
        icon: Users,
        keywords: ["account", "switch", "add account", "multiple", "accounts", "profiles", "login", "users"],
      },
      {
        id: "personal",
        label: "Personal Information",
        desc: "Email, phone number, creation date & account ownership",
        icon: FileText,
        keywords: ["email", "phone", "contact", "personal", "ownership", "created", "birthday"],
      },
      {
        id: "creator",
        label: "Creator Tools & Insights",
        desc: "Audience reach, impressions & request verification badge",
        icon: TrendingUp,
        keywords: ["creator", "insights", "analytics", "verification", "verified", "badge", "impressions", "reach"],
      },
    ],
  },
  {
    groupTitle: "Security & Privacy",
    items: [
      {
        id: "security",
        label: "Password & Security",
        desc: "Change password, 2FA two-factor & active sessions",
        icon: KeyRound,
        keywords: ["password", "security", "2fa", "two-factor", "sessions", "devices", "login", "auth"],
      },
      {
        id: "privacy",
        label: "Privacy & Interactions",
        desc: "Private account, mentions, tags & online status",
        icon: Lock,
        keywords: ["privacy", "private", "mentions", "tags", "online", "activity status", "followers"],
      },
      {
        id: "notifications",
        label: "Notification Preferences",
        desc: "Push, email & in-app alerts for likes, comments & DMs",
        icon: Bell,
        keywords: ["notifications", "push", "email", "alerts", "likes", "comments", "messages"],
      },
      {
        id: "messages",
        label: "Messages & Chat",
        desc: "Read receipts, typing indicators & request filters",
        icon: MessageSquare,
        keywords: ["messages", "chat", "read receipts", "seen", "typing", "dm", "filter"],
      },
      {
        id: "safety",
        label: "Blocked & Muted Accounts",
        desc: "Manage blocked users, muted stories & restricted accounts",
        icon: ShieldOff,
        keywords: ["blocked", "muted", "restricted", "safety", "unblock", "unmute"],
      },
    ],
  },
  {
    groupTitle: "Content & Media",
    items: [
      {
        id: "content",
        label: "Content Preferences",
        desc: "Sensitive content filtering & muted words list",
        icon: EyeOff,
        keywords: ["content", "sensitive", "filter", "muted words", "keywords", "phrases"],
      },
      {
        id: "reels",
        label: "Reels & Video Playback",
        desc: "Autoplay videos, high quality uploads & data saver",
        icon: Clapperboard,
        keywords: ["reels", "video", "autoplay", "data saver", "quality", "cellular"],
      },
      {
        id: "stories",
        label: "Stories & Social Notes",
        desc: "Story archiving, replies & voice note bubbles",
        icon: Sparkles,
        keywords: ["stories", "notes", "bubbles", "archive", "replies", "resharing"],
      },
      {
        id: "saved",
        label: "Saved Collections",
        desc: "Manage custom folders and organized bookmarks",
        icon: Folder,
        keywords: ["saved", "collections", "folders", "bookmarks", "favorites"],
      },
      {
        id: "archive",
        label: "Posts & Reels Archive",
        desc: "View and restore hidden posts and reels",
        icon: Archive,
        keywords: ["archive", "hidden", "restore", "archived posts"],
      },
      {
        id: "activity",
        label: "Your Activity & Log",
        desc: "Review past likes, comments & search history",
        icon: History,
        keywords: ["activity", "history", "likes", "comments", "search history"],
      },
    ],
  },
  {
    groupTitle: "App Preferences & Danger Zone",
    items: [
      {
        id: "appearance",
        label: "Appearance & Theme",
        desc: "Light/Dark mode, custom hex colors, font scale & density",
        icon: Palette,
        keywords: ["theme", "appearance", "dark mode", "light mode", "accent", "colors", "font", "density"],
      },
      {
        id: "language",
        label: "Language & Accessibility",
        desc: "Arabic RTL layout, English & high contrast",
        icon: Globe,
        keywords: ["language", "arabic", "english", "rtl", "accessibility", "reduced motion", "contrast"],
      },
      {
        id: "export",
        label: "Download Account Data",
        desc: "Export complete JSON archive of your profile & media",
        icon: Download,
        keywords: ["export", "download", "json", "backup", "data"],
      },
      {
        id: "pwa",
        label: "Download & Install App (PWA)",
        desc: "Download and install WhiterChat instantly on mobile or desktop",
        icon: Download,
        keywords: ["pwa", "download", "install", "app", "mobile", "desktop"],
      },
      {
        id: "feedback",
        label: "Help & Feedback Center",
        desc: "Report issues, request features & view support tickets",
        icon: LifeBuoy,
        keywords: ["help", "feedback", "support", "ticket", "bug", "report", "issue", "contact"],
      },
      {
        id: "account",
        label: "Account Actions",
        desc: "Sign out, deactivate or permanently delete account",
        icon: Shield,
        keywords: ["logout", "sign out", "deactivate", "delete", "danger"],
      },
    ],
  },
];

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    if (typeof window !== "undefined") {
      if (window.location.pathname.includes("/plans")) return "plans";
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam) return tabParam as SettingsTab;
    }
    return "profile";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [pwaModalOpen, setPwaModalOpen] = useState(false);
  const [mobileSubPageOpen, setMobileSubPageOpen] = useState(() => {
    if (typeof window !== "undefined") {
      if (window.location.pathname.includes("/plans")) return true;
      const params = new URLSearchParams(window.location.search);
      return !!params.get("tab");
    }
    return false;
  });

  // Listen for query params changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.location.pathname.includes("/plans")) {
        setActiveTab("plans");
        setMobileSubPageOpen(true);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as SettingsTab | null;
      if (tabParam) {
        setActiveTab(tabParam);
        setMobileSubPageOpen(true);
      }
    }
  }, []);

  // Filter items by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return SETTINGS_GROUPS;
    const q = searchQuery.toLowerCase().trim();

    return SETTINGS_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.toLowerCase().includes(q))
      ),
    })).filter((group) => group.items.length > 0);
  }, [searchQuery]);

  const activeItem = useMemo(() => {
    for (const group of SETTINGS_GROUPS) {
      const match = group.items.find((i) => i.id === activeTab);
      if (match) return match;
    }
    return SETTINGS_GROUPS[0].items[0];
  }, [activeTab]);

  const handleSelectTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    setMobileSubPageOpen(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBackToHome = () => {
    setMobileSubPageOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const renderActiveSection = () => {
    switch (activeTab) {
      case "profile":
        return <EditProfileSection />;
      case "plans":
        return <PlansBillingSection />;
      case "verification":
        return <VerificationSection />;
      case "multi-account":
        return <MultiAccountSection />;
      case "personal":
        return <PersonalInfoSection />;
      case "creator":
        return <CreatorDashboardSection />;
      case "security":
        return <SecuritySection />;
      case "privacy":
        return <PrivacySection />;
      case "notifications":
        return <NotificationsSection />;
      case "messages":
        return <MessagesSection />;
      case "content":
        return <ContentPreferencesSection />;
      case "safety":
        return <BlockedMutedRestrictedSection />;
      case "stories":
        return <StoriesNotesSettingsSection />;
      case "reels":
        return <ReelsMediaSection />;
      case "saved":
        return <SavedCollectionsSection />;
      case "archive":
        return <ArchiveSection />;
      case "activity":
        return <YourActivitySection />;
      case "appearance":
        return <AppearanceSection />;
      case "language":
        return <LanguageAccessibilitySection />;
      case "export":
        return <DataExportSection />;
      case "pwa":
        return <PwaSection />;
      case "feedback":
        return <FeedbackCenterSection />;
      case "account":
        return <AccountActionsSection onNavigateToMultiAccount={() => handleSelectTab("multi-account")} />;
      default:
        return <EditProfileSection />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full pt-2 sm:pt-4 pb-20 md:pb-8 px-3 sm:px-6">
      {/* ══════════════════════════════════════════════════════════
          MOBILE VIEW (< md)
          ══════════════════════════════════════════════════════════ */}
      <div className="block md:hidden">
        {!mobileSubPageOpen ? (
          /* Mobile Settings Home */
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            {/* Mobile Header & Search */}
            <div className="space-y-3.5 pt-1">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage your account, privacy, security, and preferences
                </p>
              </div>

              {/* Instant Search Bar */}
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search settings..."
                  className="pl-9 pr-9 h-11 text-sm rounded-xl bg-card border-border shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Categories Grouped List */}
            <div className="space-y-5 pb-8">
              {filteredGroups.length === 0 ? (
                <div className="p-8 text-center bg-card border border-border rounded-2xl">
                  <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">No settings found</p>
                  <p className="text-xs text-muted-foreground mt-1">No results matching "{searchQuery}"</p>
                </div>
              ) : (
                filteredGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-2">
                    <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {group.groupTitle}
                    </div>
                    <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden shadow-xs">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectTab(item.id)}
                            className="w-full flex items-center justify-between p-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/80 min-h-[58px]"
                          >
                            <div className="flex items-center gap-3.5 min-w-0 pr-2">
                              <div className="w-9 h-9 rounded-xl bg-muted/80 flex items-center justify-center shrink-0 text-foreground">
                                <Icon className="w-4.5 h-4.5 text-foreground" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-foreground truncate">{item.label}</div>
                                <div className="text-xs text-muted-foreground truncate">{item.desc}</div>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0 rtl:rotate-180" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Mobile Sub-page View */
          <div className="animate-in fade-in-50 duration-200">
            {/* Sticky Navigation Header */}
            <div className="sticky top-0 z-30 -mx-3 -mt-2 px-3 py-3 bg-background/95 backdrop-blur-md border-b border-border flex items-center justify-between gap-2 mb-4">
              <button
                type="button"
                onClick={handleBackToHome}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold text-foreground hover:bg-muted active:bg-muted/80 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                <span>Settings</span>
              </button>
              <h2 className="text-sm font-bold truncate max-w-[200px] text-foreground text-center">
                {activeItem.label}
              </h2>
              <div className="w-16" />
            </div>

            {/* Sub-page Form Body with generous bottom space */}
            <div className="pb-24">
              <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
                {renderActiveSection()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          DESKTOP VIEW (md+) — Classic Sidebar + Content Panel
          ══════════════════════════════════════════════════════════ */}
      <div className="hidden md:block">
        {/* Desktop Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings & Preferences</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your account security, profile presence, and application configuration.
            </p>
          </div>

          {/* Desktop Search Bar */}
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              className="pl-9 pr-9 h-10 text-xs rounded-xl bg-card border-border"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Desktop 12-Column Grid */}
        <div className="grid grid-cols-12 gap-6 bg-card border border-border rounded-3xl p-6 shadow-sm min-h-[700px]">
          {/* Navigation Sidebar */}
          <div className="col-span-4 border-r border-border pr-4 space-y-6">
            {/* Install App / Download PWA Card */}
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-foreground">Install WhiterChat</h4>
                  <p className="text-[11px] text-muted-foreground">Get the app on your home screen or desktop</p>
                </div>
              </div>
              <Button
                onClick={() => setPwaModalOpen(true)}
                size="sm"
                className="w-full h-9 text-xs font-bold rounded-xl gap-2 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Install or Download App
              </Button>
            </div>

            {filteredGroups.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No settings match "{searchQuery}"
              </div>
            ) : (
              filteredGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1.5">
                  <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    {group.groupTitle}
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTab(item.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all",
                            isActive
                              ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                              : "hover:bg-muted/60 text-foreground/90"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                            <div className="min-w-0">
                              <div className="text-xs truncate">{item.label}</div>
                            </div>
                          </div>
                          <ChevronRight className={cn("w-4 h-4 shrink-0 opacity-50", isActive && "opacity-100")} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Content Panel */}
          <div className="col-span-8 pl-2">
            <div className="animate-in fade-in-50 duration-200">
              {renderActiveSection()}
            </div>
          </div>
        </div>
      </div>

      <InstallPwaModal forceOpen={pwaModalOpen} onClose={() => setPwaModalOpen(false)} />
    </div>
  );
}
