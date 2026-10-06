import React, { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api-url";
import { useAuth } from "@/lib/auth";
import {
  CreditCard,
  Sparkles,
  Crown,
  Building2,
  CheckCircle2,
  Shield,
  Zap,
  TrendingUp,
  Users,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Clock,
  Briefcase,
  Layers,
  ArrowRight,
  UserPlus,
  Trash2,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface PlanData {
  planId: "free" | "pro" | "vip" | "business";
  name: string;
  tagline: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  badgeLabel?: string;
  badgeColor?: string;
  perks: string[];
  features: Record<string, boolean>;
  limits: Record<string, number>;
  isPopular?: boolean;
}

interface MyPlanResponse {
  plan: "free" | "pro" | "vip" | "business";
  status: "active" | "cancelled" | "expired";
  startedAt: string;
  expiresAt: string | null;
  billingCycle: "monthly" | "yearly";
  accountType: "personal" | "creator" | "business";
  planBadge: string | null;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  aiUsage: {
    used: number;
    max: number;
    remaining: number;
    resetsAt: string;
  };
  businessProfile: any;
}

export function PlansBillingSection() {
  const { token, updateUser, user } = useAuth();
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [myPlan, setMyPlan] = useState<MyPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [activeSubTab, setActiveSubTab] = useState<"plans" | "business" | "analytics">("plans");

  // Upgrade / Subscribe State
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Business Hub State
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamCount, setTeamCount] = useState(0);
  const [maxTeam, setMaxTeam] = useState(15);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);

  // Business Profile Form
  const [bizName, setBizName] = useState("");
  const [bizCategory, setBizCategory] = useState("");
  const [bizEmail, setBizEmail] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [bizWebsite, setBizWebsite] = useState("");
  const [bizHours, setBizHours] = useState("");
  const [savingBiz, setSavingBiz] = useState(false);

  // Analytics Overview State
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token || localStorage.getItem("pixlr_token")}`,
  });

  const refreshCurrentUser = async () => {
    try {
      const res = await fetch(apiUrl("/api/users/me"), { headers: getHeaders() });
      if (res.ok) {
        const u = await res.json();
        if (updateUser) updateUser(u);
      }
    } catch {}
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, meRes] = await Promise.all([
        fetch(apiUrl("/api/plans"), { headers: getHeaders() }),
        fetch(apiUrl("/api/plans/me"), { headers: getHeaders() }),
      ]);

      if (plansRes.ok) {
        const pData = await plansRes.json();
        setPlans(pData.plans || []);
      }

      if (meRes.ok) {
        const mData: MyPlanResponse = await meRes.json();
        setMyPlan(mData);
        setBillingCycle(mData.billingCycle || "monthly");

        if (mData.businessProfile) {
          setBizName(mData.businessProfile.businessName || "");
          setBizCategory(mData.businessProfile.category || "");
          setBizEmail(mData.businessProfile.contactEmail || "");
          setBizPhone(mData.businessProfile.contactPhone || "");
          setBizAddress(mData.businessProfile.address || "");
          setBizWebsite(mData.businessProfile.website || "");
          setBizHours(mData.businessProfile.supportHours || "");
        }
      }
    } catch (err) {
      console.error("Failed to load subscription data:", err);
      toast.error("Could not load plans and billing details");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async () => {
    if (myPlan?.plan !== "business") return;
    setLoadingTeam(true);
    try {
      const res = await fetch(apiUrl("/api/plans/business/team"), { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
        setTeamCount(data.currentCount || 0);
        setMaxTeam(data.maxMembers || 15);
      }
    } catch (err) {
      console.error("Failed to fetch team:", err);
    } finally {
      setLoadingTeam(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch(apiUrl("/api/plans/analytics/overview"), { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeSubTab === "business") {
      fetchTeam();
    } else if (activeSubTab === "analytics") {
      fetchAnalytics();
    }
  }, [activeSubTab, myPlan?.plan]);

  const handleSubscribe = async (planId: string) => {
    if (myPlan?.plan === planId) return;
    setSubscribing(planId);
    try {
      const res = await fetch(apiUrl("/api/plans/subscribe"), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          planId,
          billingCycle,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Subscription upgrade failed");
      }

      toast.success(data.message || `Activated ${planId.toUpperCase()} successfully!`);
      await fetchData();
      refreshCurrentUser();
    } catch (err: any) {
      toast.error(err.message || "Failed to change subscription plan");
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(apiUrl("/api/plans/cancel"), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ reason: "User cancelled from web settings" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel subscription");
      }

      toast.success("Subscription will not renew at the end of the period.");
      setCancelModalOpen(false);
      await fetchData();
      refreshCurrentUser();
    } catch (err: any) {
      toast.error(err.message || "Could not cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  const handleSaveBusinessProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBiz(true);
    try {
      const res = await fetch(apiUrl("/api/plans/business/profile"), {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          businessName: bizName,
          category: bizCategory,
          contactEmail: bizEmail,
          contactPhone: bizPhone,
          address: bizAddress,
          website: bizWebsite,
          supportHours: bizHours,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      toast.success("Business profile saved successfully!");
      await fetchData();
      refreshCurrentUser();
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSavingBiz(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(apiUrl("/api/plans/business/team/invite"), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          name: inviteName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite member");

      toast.success(data.message || "Team member invited!");
      setInviteEmail("");
      setInviteName("");
      fetchTeam();
    } catch (err: any) {
      toast.error(err.message || "Could not invite member");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from your Business team?`)) return;
    try {
      const res = await fetch(apiUrl(`/api/plans/business/team/${memberId}`), {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to remove member");
      toast.success("Team member removed");
      fetchTeam();
    } catch (err: any) {
      toast.error(err.message || "Could not remove member");
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">Loading subscription details...</p>
      </div>
    );
  }

  const currentTier = myPlan?.plan || "free";
  const isPaid = currentTier !== "free";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Top Hero: Current Subscription Status ────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card/95 to-primary/5 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Current Plan
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  currentTier === "business"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : currentTier === "vip"
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : currentTier === "pro"
                    ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {currentTier === "business" && <Building2 className="w-3.5 h-3.5" />}
                {currentTier === "vip" && <Crown className="w-3.5 h-3.5" />}
                {currentTier === "pro" && <Sparkles className="w-3.5 h-3.5" />}
                {currentTier === "free" && <Shield className="w-3.5 h-3.5" />}
                {currentTier.toUpperCase()}
              </span>

              {isPaid && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    myPlan?.status === "active"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-amber-500/10 text-amber-500"
                  }`}
                >
                  {myPlan?.status === "active" ? "Active" : "Cancelled (Grace period)"}
                </span>
              )}
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {currentTier === "free" && "WhiterChat Free Tier"}
              {currentTier === "pro" && "WhiterChat Pro Creator"}
              {currentTier === "vip" && "WhiterChat VIP Elite"}
              {currentTier === "business" && "WhiterChat Business Organization"}
            </h2>

            <p className="text-sm text-muted-foreground max-w-xl">
              {currentTier === "free" &&
                "You have full access to core posting, messaging, stories, and social interactions with fair daily quotas."}
              {currentTier === "pro" &&
                "Enjoy advanced creator analytics, 60 daily AI credits, larger 15-item carousels, and priority media uploads."}
              {currentTier === "vip" &&
                "VIP Elite perks active: 200 daily AI credits, 20-item carousels, VIP badge, and 90-day audience retention data."}
              {currentTier === "business" &&
                "Commercial power tools: Business profile, up to 15 team members, 500 daily AI credits, and lead conversion analytics."}
            </p>

            {myPlan?.expiresAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {myPlan.status === "active" ? "Renews / Valid until:" : "Access expires on:"}{" "}
                  <strong className="text-foreground">
                    {new Date(myPlan.expiresAt).toLocaleDateString()}
                  </strong>{" "}
                  ({myPlan.billingCycle} billing)
                </span>
              </div>
            )}
          </div>

          {/* Daily AI Usage Bar */}
          <div className="bg-background/80 backdrop-blur-sm border border-border/80 rounded-xl p-4 md:w-72 shrink-0 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Daily AI Usage
              </span>
              <span className="text-muted-foreground">
                {myPlan?.aiUsage.used} / {myPlan?.aiUsage.max} credits
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((myPlan?.aiUsage.used || 0) / Math.max(1, myPlan?.aiUsage.max || 15)) * 100
                  )}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{myPlan?.aiUsage.remaining} remaining today</span>
              <span>Resets midnight UTC</span>
            </div>
          </div>
        </div>

        {/* Action strip */}
        {isPaid && (
          <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-muted-foreground">
              Free users retain all normal social features. Downgrading never deletes your content.
            </div>
            <button
              onClick={() => setCancelModalOpen(true)}
              className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-4 transition"
            >
              Cancel recurring subscription
            </button>
          </div>
        )}
      </div>

      {/* ── Sub Navigation Tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveSubTab("plans")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeSubTab === "plans"
              ? "bg-secondary text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Compare & Upgrade Plans
        </button>

        <button
          onClick={() => setActiveSubTab("analytics")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeSubTab === "analytics"
              ? "bg-secondary text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Creator & Growth Analytics
        </button>

        <button
          onClick={() => setActiveSubTab("business")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition ${
            activeSubTab === "business"
              ? "bg-secondary text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Business Hub {currentTier !== "business" && "(Preview)"}
        </button>
      </div>

      {/* ── TAB 1: Plans Grid ─────────────────────────────────────────────────── */}
      {activeSubTab === "plans" && (
        <div className="space-y-6">
          {/* Billing Cycle Switch */}
          <div className="flex items-center justify-center gap-3">
            <span
              className={`text-xs font-semibold cursor-pointer ${
                billingCycle === "monthly" ? "text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => setBillingCycle("monthly")}
            >
              Monthly Billing
            </span>
            <button
              type="button"
              onClick={() => setBillingCycle((b) => (b === "monthly" ? "yearly" : "monthly"))}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-secondary p-0.5 transition-colors"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-primary transition-transform ${
                  billingCycle === "yearly" ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span
              className={`text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
                billingCycle === "yearly" ? "text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => setBillingCycle("yearly")}
            >
              Yearly Billing
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                Save ~17%
              </span>
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((p) => {
              const isCurrent = currentTier === p.planId;
              const isFree = p.planId === "free";
              const isPro = p.planId === "pro";
              const isVip = p.planId === "vip";
              const isBiz = p.planId === "business";

              const displayPrice = billingCycle === "yearly" ? p.priceYearly : p.priceMonthly;
              const periodLabel = billingCycle === "yearly" ? "/year" : "/month";

              return (
                <div
                  key={p.planId}
                  className={`relative flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md ${
                    isCurrent
                      ? "border-primary/60 ring-2 ring-primary/20"
                      : p.isPopular
                      ? "border-indigo-500/50"
                      : "border-border"
                  }`}
                >
                  {p.isPopular && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-600 text-white shadow-sm">
                      Most Popular
                    </div>
                  )}

                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white shadow-sm">
                      Your Current Plan
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      {isBiz && <Building2 className="w-5 h-5 text-emerald-500" />}
                      {isVip && <Crown className="w-5 h-5 text-amber-500" />}
                      {isPro && <Sparkles className="w-5 h-5 text-indigo-500" />}
                      {isFree && <Shield className="w-5 h-5 text-muted-foreground" />}
                      <h3 className="font-bold text-lg text-foreground">{p.name}</h3>
                    </div>

                    <p className="text-xs text-muted-foreground min-h-[32px] line-clamp-2 mb-4">
                      {p.tagline}
                    </p>

                    {/* Price */}
                    <div className="mb-5 pb-5 border-b border-border/80">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-foreground">
                          {displayPrice}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {p.currency} {periodLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {isFree ? "Free forever. No credit card required." : "Full platform access"}
                      </div>
                    </div>

                    {/* Quotas & Limits badge overview */}
                    <div className="space-y-2 mb-5 text-xs bg-secondary/30 rounded-xl p-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Daily AI Credits:</span>
                        <strong className="text-foreground">{p.limits?.dailyAiGenerations}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Carousel Items:</span>
                        <strong className="text-foreground">{p.limits?.maxCarouselMedia}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Reel Size:</span>
                        <strong className="text-foreground">{p.limits?.maxReelSizeMb} MB</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bio Links:</span>
                        <strong className="text-foreground">{p.limits?.maxCustomLinks}</strong>
                      </div>
                    </div>

                    {/* Perks List */}
                    <div className="space-y-2 mb-6">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Included Perks
                      </div>
                      {p.perks.map((perk, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{perk}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action CTA */}
                  <div>
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-secondary text-muted-foreground cursor-default flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> Active Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(p.planId)}
                        disabled={Boolean(subscribing)}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                          isFree
                            ? "bg-secondary hover:bg-secondary/80 text-foreground"
                            : isBiz
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : isVip
                            ? "bg-amber-600 hover:bg-amber-500 text-white"
                            : "bg-primary hover:bg-primary/90 text-primary-foreground"
                        }`}
                      >
                        {subscribing === p.planId ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            {isFree ? "Downgrade to Free" : `Upgrade to ${p.name}`}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: Growth & Creator Analytics ─────────────────────────────────── */}
      {activeSubTab === "analytics" && (
        <div className="space-y-6">
          {loadingAnalytics ? (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              Loading analytics report...
            </div>
          ) : analyticsData ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground uppercase font-semibold">
                    Followers
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    {analyticsData.summary?.followersCount}
                  </div>
                  <div className="text-[11px] text-emerald-500 mt-1">Audience Reach</div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground uppercase font-semibold">
                    Total Post Likes
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    {analyticsData.summary?.totalLikes}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">Community reactions</div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground uppercase font-semibold">
                    Engagement Rate
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    {analyticsData.summary?.engagementRate}
                  </div>
                  <div className="text-[11px] text-indigo-500 mt-1">Active interaction</div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground uppercase font-semibold">
                    Data Retention
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    {analyticsData.retentionDays} Days
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {currentTier.toUpperCase()} tier history
                  </div>
                </div>
              </div>

              {/* Timeline Table */}
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <h4 className="font-bold text-sm text-foreground flex items-center justify-between">
                  <span>Recent Daily Impressions & Profile Views</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Last {analyticsData.timeline?.length || 0} days
                  </span>
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-muted-foreground">
                    <thead className="bg-secondary/40 text-[11px] uppercase tracking-wider text-foreground">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Impressions</th>
                        <th className="py-2.5 px-3">Engagements</th>
                        <th className="py-2.5 px-3">Profile Views</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(analyticsData.timeline || []).slice(0, 10).map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-secondary/20">
                          <td className="py-2.5 px-3 font-medium text-foreground">{row.date}</td>
                          <td className="py-2.5 px-3">{row.impressions}</td>
                          <td className="py-2.5 px-3">{row.engagements}</td>
                          <td className="py-2.5 px-3">{row.profileViews}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Engaging Posts */}
              {analyticsData.topPosts?.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                  <h4 className="font-bold text-sm text-foreground">Top Performing Content</h4>
                  <div className="space-y-2">
                    {analyticsData.topPosts.map((p: any) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 hover:bg-secondary/30 transition text-xs"
                      >
                        <span className="font-medium text-foreground line-clamp-1">{p.caption}</span>
                        <div className="flex items-center gap-4 shrink-0 text-muted-foreground">
                          <span>❤️ {p.likesCount}</span>
                          <span>💬 {p.commentsCount}</span>
                          <span>🔖 {p.savesCount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No analytics data available at this time.
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Business Hub ──────────────────────────────────────────────── */}
      {activeSubTab === "business" && (
        <div className="space-y-6">
          {currentTier !== "business" && (
            <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                  Upgrade to Business to Unlock the Commercial Suite
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Business accounts include team collaboration, official company profiles, lead
                  inquiries, and 500 daily AI generation credits.
                </p>
              </div>
              <button
                onClick={() => handleSubscribe("business")}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shrink-0 transition"
              >
                Upgrade to Business (19.99 JOD/mo)
              </button>
            </div>
          )}

          {/* Form: Business Public Profile */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-500" />
              Company Profile & Inquiries
            </h3>
            <p className="text-xs text-muted-foreground">
              These details appear on your public profile, allowing clients and customers to contact
              your organization directly.
            </p>

            <form onSubmit={handleSaveBusinessProfile} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Business / Brand Name
                  </label>
                  <input
                    type="text"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    placeholder="e.g. Whiter Media LLC"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Industry / Category
                  </label>
                  <input
                    type="text"
                    value={bizCategory}
                    onChange={(e) => setBizCategory(e.target.value)}
                    placeholder="e.g. Software, Apparel, Digital Agency"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={bizEmail}
                    onChange={(e) => setBizEmail(e.target.value)}
                    placeholder="sales@company.com"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Contact Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={bizPhone}
                    onChange={(e) => setBizPhone(e.target.value)}
                    placeholder="+962 7 9000 0000"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Physical Address / HQ
                  </label>
                  <input
                    type="text"
                    value={bizAddress}
                    onChange={(e) => setBizAddress(e.target.value)}
                    placeholder="Amman, Jordan"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Support / Working Hours
                  </label>
                  <input
                    type="text"
                    value={bizHours}
                    onChange={(e) => setBizHours(e.target.value)}
                    placeholder="Sun - Thu, 9:00 AM - 6:00 PM"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingBiz}
                  className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-sm transition hover:opacity-90 disabled:opacity-50"
                >
                  {savingBiz ? "Saving..." : "Save Business Details"}
                </button>
              </div>
            </form>
          </div>

          {/* Section: Multi-User Team Collaboration */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  Team Management
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Invite teammates to assist with content creation, inbox management, and moderation.
                </p>
              </div>
              <div className="text-xs font-semibold text-muted-foreground">
                {teamCount} / {maxTeam} Seats Used
              </div>
            </div>

            {/* Invite Form */}
            <form
              onSubmit={handleInviteMember}
              className="bg-secondary/30 rounded-xl p-4 flex flex-col md:flex-row items-center gap-3"
            >
              <input
                type="email"
                placeholder="Teammate's email address..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full md:flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />

              <input
                type="text"
                placeholder="Full Name (optional)"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="w-full md:w-44 bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />

              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full md:w-36 bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="editor">Editor</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Team Admin</option>
              </select>

              <button
                type="submit"
                disabled={inviting || teamCount >= maxTeam}
                className="w-full md:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition disabled:opacity-50 shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {inviting ? "Inviting..." : "Invite Member"}
              </button>
            </form>

            {/* Members List */}
            <div className="divide-y divide-border/60">
              {teamMembers.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No team members added yet. Invite your colleagues using the form above.
                </div>
              ) : (
                teamMembers.map((m) => (
                  <div key={m._id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-semibold text-foreground">{m.name || m.email}</div>
                      <div className="text-muted-foreground flex items-center gap-2">
                        <span>{m.email}</span>
                        <span>•</span>
                        <span className="capitalize font-medium text-indigo-400">{m.role}</span>
                        <span>•</span>
                        <span className="capitalize text-zinc-500">{m.status}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveMember(m._id, m.email)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition rounded-lg"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Subscription Graceful Modal ───────────────────────────────── */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 text-foreground shadow-2xl">
            <h3 className="text-base font-bold flex items-center gap-2 text-foreground mb-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Cancel Subscription?
            </h3>

            <p className="text-xs text-muted-foreground mb-4">
              Your subscription will remain active until{" "}
              <strong>
                {myPlan?.expiresAt ? new Date(myPlan.expiresAt).toLocaleDateString() : "the end of your period"}
              </strong>
              . You will not be charged again.
            </p>

            <div className="bg-secondary/40 rounded-xl p-3 text-xs space-y-1.5 text-muted-foreground mb-5">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-500" /> Zero Data Loss Guarantee
              </div>
              <p>Your posts, reels, followers, messages, and saved content will remain 100% intact.</p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 bg-secondary text-foreground text-xs font-semibold rounded-xl"
              >
                Keep My Plan
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 bg-destructive text-destructive-foreground text-xs font-semibold rounded-xl transition"
              >
                {cancelling ? "Processing..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
