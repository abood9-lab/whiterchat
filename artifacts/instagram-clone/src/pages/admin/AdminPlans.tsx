import React, { useState, useEffect } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminApi } from "./admin-api";
import {
  Sparkles,
  CreditCard,
  Crown,
  Building2,
  Users,
  Search,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sliders,
  DollarSign,
  Calendar,
  Shield,
  Layers,
  Edit2,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

export default function AdminPlans() {
  const [activeTab, setActiveTab] = useState<"plans" | "subscribers">("plans");
  const [overview, setOverview] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [totalSubscribers, setTotalSubscribers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscriber filters
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Edit Plan Modal
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  // Assign Plan Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [targetUsername, setTargetUsername] = useState("");
  const [assignPlanId, setAssignPlanId] = useState("pro");
  const [assignDuration, setAssignDuration] = useState("30");
  const [assignCycle, setAssignCycle] = useState("monthly");
  const [assignReason, setAssignReason] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchOverview = async () => {
    try {
      const data = await adminApi.getPlansOverview();
      setOverview(data);
    } catch (err: any) {
      console.error("Failed to load overview:", err);
    }
  };

  const fetchPlans = async () => {
    try {
      const data = await adminApi.getPlansConfig();
      setPlans(data.plans || []);
    } catch (err: any) {
      console.error("Failed to load plans:", err);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const data = await adminApi.getSubscribers({
        search: searchTerm,
        plan: planFilter,
        status: statusFilter,
        page,
        limit: 20,
      });
      setSubscribers(data.subscribers || []);
      setTotalSubscribers(data.total || 0);
    } catch (err: any) {
      console.error("Failed to load subscribers:", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchOverview(), fetchPlans(), fetchSubscribers()]);
    } catch (err: any) {
      setError(err.message || "Failed to load monetization data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchSubscribers();
  }, [searchTerm, planFilter, statusFilter, page]);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setSavingPlan(true);
    try {
      await adminApi.updatePlanConfig(editingPlan.planId, editingPlan);
      await fetchPlans();
      await fetchOverview();
      setEditingPlan(null);
    } catch (err: any) {
      alert("Failed to save plan: " + err.message);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim()) {
      alert("Please provide a valid User ID");
      return;
    }
    setAssigning(true);
    try {
      await adminApi.assignPlan({
        userId: targetUserId.trim(),
        planId: assignPlanId,
        durationDays: parseInt(assignDuration, 10) || 30,
        cycle: assignCycle,
        reason: assignReason,
      });
      alert(`Plan ${assignPlanId.toUpperCase()} successfully assigned!`);
      setAssignModalOpen(false);
      setTargetUserId("");
      setTargetUsername("");
      setAssignReason("");
      fetchOverview();
      fetchSubscribers();
    } catch (err: any) {
      alert("Failed to assign plan: " + err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleRevokePlan = async (user: any) => {
    const confirm = window.confirm(
      `Are you sure you want to revert @${user.username} to the Free plan? Their access will immediately downgrade.`
    );
    if (!confirm) return;

    try {
      await adminApi.revokePlan({
        userId: user._id || user.id,
        reason: "Administrative revocation from Monetization panel",
      });
      alert(`@${user.username} reverted to Free plan.`);
      fetchOverview();
      fetchSubscribers();
    } catch (err: any) {
      alert("Failed to revoke plan: " + err.message);
    }
  };

  const getPlanBadge = (planId: string) => {
    switch (planId) {
      case "business":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Building2 className="w-3.5 h-3.5" /> Business
          </span>
        );
      case "vip":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Crown className="w-3.5 h-3.5" /> VIP Elite
          </span>
        );
      case "pro":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5" /> Pro Creator
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
            Free
          </span>
        );
    }
  };

  return (
    <AdminLayout activeTab="plans">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <CreditCard className="w-7 h-7 text-indigo-400" />
              Plans & Monetization
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Manage platform subscription tiers, feature flags, numeric limits, and active subscribers.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setTargetUserId("");
                setTargetUsername("");
                setAssignModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition"
            >
              <Plus className="w-4 h-4" /> Assign Plan
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        {overview && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Estimated MRR</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {overview.estimatedMRR} <span className="text-sm text-zinc-400">{overview.currency}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Monthly Recurring Revenue</p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Paid Subscribers</span>
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-white">{overview.activePaidCount}</div>
              <p className="text-xs text-zinc-500 mt-1">
                {overview.totalUsers > 0
                  ? `${((overview.activePaidCount / overview.totalUsers) * 100).toFixed(1)}% conversion rate`
                  : "0% conversion rate"}
              </p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Plan Breakdown</span>
                <Layers className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-center gap-2 text-sm text-white font-medium">
                <span className="text-indigo-400">{overview.planCounts.pro} Pro</span>
                <span>•</span>
                <span className="text-amber-400">{overview.planCounts.vip} VIP</span>
                <span>•</span>
                <span className="text-emerald-400">{overview.planCounts.business} Biz</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">{overview.planCounts.free} Free users</p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Registered</span>
                <Users className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="text-2xl font-bold text-white">{overview.totalUsers}</div>
              <p className="text-xs text-zinc-500 mt-1">Platform community members</p>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <button
            onClick={() => setActiveTab("plans")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === "plans"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
            }`}
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Plans & Entitlements
            </span>
          </button>
          <button
            onClick={() => setActiveTab("subscribers")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === "subscribers"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
            }`}
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Subscribers Directory ({totalSubscribers})
            </span>
          </button>
        </div>

        {/* TAB 1: Plans Configuration Grid */}
        {activeTab === "plans" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((p) => {
              const isFree = p.planId === "free";
              const isPro = p.planId === "pro";
              const isVip = p.planId === "vip";
              const isBiz = p.planId === "business";

              return (
                <div
                  key={p.planId}
                  className={`bg-zinc-900/70 border rounded-2xl p-5 flex flex-col justify-between transition relative overflow-hidden ${
                    p.isPopular
                      ? "border-indigo-500/50 shadow-lg shadow-indigo-500/5"
                      : "border-zinc-800/80"
                  }`}
                >
                  {p.isPopular && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Popular
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {isBiz && <Building2 className="w-5 h-5 text-emerald-400" />}
                      {isVip && <Crown className="w-5 h-5 text-amber-400" />}
                      {isPro && <Sparkles className="w-5 h-5 text-indigo-400" />}
                      {isFree && <Shield className="w-5 h-5 text-zinc-400" />}
                      <h3 className="font-bold text-lg text-white">{p.name}</h3>
                    </div>

                    <p className="text-xs text-zinc-400 mb-4 line-clamp-2">{p.tagline}</p>

                    <div className="mb-4 pb-4 border-b border-zinc-800/80">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-white">{p.priceMonthly}</span>
                        <span className="text-xs font-semibold text-zinc-400">
                          {p.currency} / month
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        Yearly: {p.priceYearly} {p.currency}/yr
                      </div>
                    </div>

                    {/* Key Limits */}
                    <div className="space-y-2 mb-4 text-xs">
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-500">Daily AI Credits:</span>
                        <span className="font-semibold text-white">
                          {p.limits?.dailyAiGenerations}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-500">Carousel Media:</span>
                        <span className="font-semibold text-white">
                          {p.limits?.maxCarouselMedia} items
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-500">Max Reel Size:</span>
                        <span className="font-semibold text-white">{p.limits?.maxReelSizeMb} MB</span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-500">Saved Collections:</span>
                        <span className="font-semibold text-white">
                          {p.limits?.maxSavedCollections}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-500">Team Members:</span>
                        <span className="font-semibold text-white">
                          {p.limits?.maxTeamMembers || 0}
                        </span>
                      </div>
                    </div>

                    {/* Features list */}
                    <div className="space-y-1.5 mb-5 border-t border-zinc-800/80 pt-3">
                      <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        Perks & Features
                      </div>
                      {(p.perks || []).slice(0, 5).map((perk: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-1.5 text-xs text-zinc-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{perk}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setEditingPlan({ ...p })}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Configure Plan & Limits
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: Subscribers Directory */}
        {activeTab === "subscribers" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user by name, @username, or email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-zinc-800/70 border border-zinc-700/60 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <select
                  value={planFilter}
                  onChange={(e) => {
                    setPlanFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-zinc-800/70 border border-zinc-700/60 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All Plans</option>
                  <option value="pro">Pro Plan</option>
                  <option value="vip">VIP Plan</option>
                  <option value="business">Business Plan</option>
                  <option value="free">Free Plan</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-zinc-800/70 border border-zinc-700/60 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-300">
                  <thead className="bg-zinc-800/40 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-5 py-3.5">Current Plan</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Cycle</th>
                      <th className="px-5 py-3.5">Expires</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {subscribers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-zinc-500">
                          No users found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      subscribers.map((u) => {
                        const isPaid = u.subscriptionPlan && u.subscriptionPlan !== "free";
                        const expiresDate = u.subscriptionExpiresAt
                          ? new Date(u.subscriptionExpiresAt).toLocaleDateString()
                          : "Never";

                        return (
                          <tr key={u._id} className="hover:bg-zinc-800/30 transition">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                {u.avatarUrl ? (
                                  <img
                                    src={u.avatarUrl}
                                    alt={u.username}
                                    className="w-9 h-9 rounded-full object-cover border border-zinc-700"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300 text-xs">
                                    {(u.username || "U")[0].toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-semibold text-white flex items-center gap-1.5">
                                    {u.fullName || u.username}
                                    {u.isVerified && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                                    )}
                                  </div>
                                  <div className="text-xs text-zinc-400">@{u.username}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-3.5">{getPlanBadge(u.subscriptionPlan || "free")}</td>

                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  u.subscriptionStatus === "active"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : u.subscriptionStatus === "cancelled"
                                    ? "bg-amber-500/10 text-amber-400"
                                    : "bg-zinc-800 text-zinc-400"
                                }`}
                              >
                                {u.subscriptionStatus || "active"}
                              </span>
                            </td>

                            <td className="px-5 py-3.5 text-xs text-zinc-400 capitalize">
                              {u.subscriptionCycle || "monthly"}
                            </td>

                            <td className="px-5 py-3.5 text-xs text-zinc-400">{expiresDate}</td>

                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setTargetUserId(u._id);
                                    setTargetUsername(u.username);
                                    setAssignPlanId(u.subscriptionPlan || "pro");
                                    setAssignModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition"
                                >
                                  Modify
                                </button>
                                {isPaid && (
                                  <button
                                    onClick={() => handleRevokePlan(u)}
                                    className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium rounded-lg transition"
                                  >
                                    Revoke
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalSubscribers > 20 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800 text-xs text-zinc-400">
                  <div>
                    Showing {(page - 1) * 20 + 1} to{" "}
                    {Math.min(page * 20, totalSubscribers)} of {totalSubscribers} subscribers
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-3 py-1 bg-zinc-800 disabled:opacity-40 rounded-lg text-zinc-300"
                    >
                      Prev
                    </button>
                    <span>Page {page}</span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page * 20 >= totalSubscribers}
                      className="px-3 py-1 bg-zinc-800 disabled:opacity-40 rounded-lg text-zinc-300"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 1: Edit Plan Configuration */}
        {editingPlan && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 text-white my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-400" />
                  Edit Plan: {editingPlan.name} ({editingPlan.planId})
                </h3>
                <button
                  onClick={() => setEditingPlan(null)}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={editingPlan.name}
                      onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-1">Tagline</label>
                    <input
                      type="text"
                      value={editingPlan.tagline || ""}
                      onChange={(e) => setEditingPlan({ ...editingPlan, tagline: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-1">
                      Monthly Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingPlan.priceMonthly}
                      onChange={(e) =>
                        setEditingPlan({ ...editingPlan, priceMonthly: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-1">
                      Yearly Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingPlan.priceYearly}
                      onChange={(e) =>
                        setEditingPlan({ ...editingPlan, priceYearly: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-1">Currency</label>
                    <input
                      type="text"
                      value={editingPlan.currency}
                      onChange={(e) => setEditingPlan({ ...editingPlan, currency: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                      required
                    />
                  </div>
                </div>

                {/* Numeric Limits Section */}
                <div className="border-t border-zinc-800 pt-4">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">
                    Numeric Limits
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Daily AI Credits</label>
                      <input
                        type="number"
                        value={editingPlan.limits?.dailyAiGenerations || 15}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            limits: {
                              ...editingPlan.limits,
                              dailyAiGenerations: parseInt(e.target.value, 10) || 15,
                            },
                          })
                        }
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Carousel Media</label>
                      <input
                        type="number"
                        value={editingPlan.limits?.maxCarouselMedia || 10}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            limits: {
                              ...editingPlan.limits,
                              maxCarouselMedia: parseInt(e.target.value, 10) || 10,
                            },
                          })
                        }
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Max Reel MB</label>
                      <input
                        type="number"
                        value={editingPlan.limits?.maxReelSizeMb || 100}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            limits: {
                              ...editingPlan.limits,
                              maxReelSizeMb: parseInt(e.target.value, 10) || 100,
                            },
                          })
                        }
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Saved Collections</label>
                      <input
                        type="number"
                        value={editingPlan.limits?.maxSavedCollections || 5}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            limits: {
                              ...editingPlan.limits,
                              maxSavedCollections: parseInt(e.target.value, 10) || 5,
                            },
                          })
                        }
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Max Bio Links</label>
                      <input
                        type="number"
                        value={editingPlan.limits?.maxCustomLinks || 2}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            limits: {
                              ...editingPlan.limits,
                              maxCustomLinks: parseInt(e.target.value, 10) || 2,
                            },
                          })
                        }
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Team Members</label>
                      <input
                        type="number"
                        value={editingPlan.limits?.maxTeamMembers || 0}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            limits: {
                              ...editingPlan.limits,
                              maxTeamMembers: parseInt(e.target.value, 10) || 0,
                            },
                          })
                        }
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Feature Toggles */}
                <div className="border-t border-zinc-800 pt-4">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">
                    Feature Gating
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { key: "advancedAnalytics", label: "Advanced Creator Analytics" },
                      { key: "businessAnalytics", label: "Business Lead & Conversion Analytics" },
                      { key: "teamManagement", label: "Multi-User Team Management" },
                      { key: "priorityFeedRanking", label: "Priority Feed Ranking" },
                      { key: "customBadges", label: "Exclusive Plan Profile Badge" },
                      { key: "customThemePresets", label: "Premium Theme Presets" },
                    ].map((feat) => (
                      <label
                        key={feat.key}
                        className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(editingPlan.features?.[feat.key])}
                          onChange={(e) =>
                            setEditingPlan({
                              ...editingPlan,
                              features: {
                                ...editingPlan.features,
                                [feat.key]: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 rounded text-indigo-600 bg-zinc-700 border-zinc-600"
                        />
                        <span className="text-zinc-200">{feat.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(null)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPlan}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg transition"
                  >
                    {savingPlan ? "Saving..." : "Save Plan Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Assign Plan */}
        {assignModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 text-white">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-400" />
                  Assign / Grant Plan
                </h3>
                <button
                  onClick={() => setAssignModalOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAssignPlan} className="space-y-4 text-sm">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">
                    Target User ID {targetUsername ? `(@${targetUsername})` : ""}
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Mongo ObjectId or select user"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Select Tier</label>
                  <select
                    value={assignPlanId}
                    onChange={(e) => setAssignPlanId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="pro">Pro Creator</option>
                    <option value="vip">VIP Elite</option>
                    <option value="business">Business Professional</option>
                    <option value="free">Free Plan (Reset)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-1">Duration</label>
                    <select
                      value={assignDuration}
                      onChange={(e) => setAssignDuration(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="30">30 Days (1 Month)</option>
                      <option value="90">90 Days (Quarterly)</option>
                      <option value="180">180 Days (Half Year)</option>
                      <option value="365">365 Days (1 Year)</option>
                      <option value="3650">Indefinite (10 Years)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-1">Cycle</label>
                    <select
                      value={assignCycle}
                      onChange={(e) => setAssignCycle(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Admin Reason</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. VIP partner gift, manual wire transfer confirmed..."
                    value={assignReason}
                    onChange={(e) => setAssignReason(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setAssignModalOpen(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assigning}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl shadow-lg transition"
                  >
                    {assigning ? "Granting..." : "Confirm & Grant"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
