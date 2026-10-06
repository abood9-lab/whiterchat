import { useState, useEffect } from "react";
import { Link } from "wouter";
import { AdminLayout, useAdmin } from "./AdminLayout";
import { adminApi } from "./admin-api";
import { ADMIN_STRINGS } from "./admin-i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  UserX,
  FileText,
  Clapperboard,
  History,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  ArrowUpRight,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle2,
  BadgeCheck,
  Users2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

function AdminDashboardContent() {
  const { lang, token, admin } = useAdmin();
  const t = ADMIN_STRINGS[lang];
  const [range, setRange] = useState<string>("30d");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchMetrics = async (timeRange: string, tkn: string | null) => {
    try {
      setLoading(true);
      const res = await adminApi.getMetrics(timeRange, tkn);
      setData(res);
    } catch (err) {
      console.error("Failed to load metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(range, token);
  }, [range, token]);

  const metrics = data?.metrics;
  const timeline = data?.timeline || [];

  const ranges = [
    { id: "today", label: t.today },
    { id: "7d", label: t.last7Days },
    { id: "30d", label: t.last30Days },
    { id: "90d", label: t.last90Days },
    { id: "all", label: t.allTime },
  ];

  return (
    <div className="space-y-6">
            {/* Header & Range Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {t.dashboard}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time platform activity, user growth, and moderation queues.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-secondary/70 p-1 rounded-xl flex items-center gap-1 border border-border">
                  {ranges.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setRange(r.id)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                        range === r.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fetchMetrics(range, token)}
                  className="h-8 w-8"
                  title="Refresh Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {loading && !data ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                <span className="text-xs text-muted-foreground">{t.loading}</span>
              </div>
            ) : (
              <>
                {/* Top Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  <Card className="shadow-none border-border/80">
                    <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        {t.totalUsers}
                      </CardTitle>
                      <Users className="w-4 h-4 text-primary" />
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                      <div className="text-xl font-bold">{metrics?.users?.total?.toLocaleString() ?? 0}</div>
                      <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-0.5 mt-0.5">
                        <TrendingUp className="w-3 h-3" />
                        <span>+{metrics?.users?.newInPeriod ?? 0} in period</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-none border-border/80">
                    <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        {t.verifiedUsers}
                      </CardTitle>
                      <UserCheck className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                      <div className="text-xl font-bold">{metrics?.users?.verified?.toLocaleString() ?? 0}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {metrics?.users?.suspended ?? 0} suspended
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-none border-border/80">
                    <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        {t.totalPosts}
                      </CardTitle>
                      <FileText className="w-4 h-4 text-amber-500" />
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                      <div className="text-xl font-bold">{metrics?.content?.totalPosts?.toLocaleString() ?? 0}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        +{metrics?.content?.newPostsInPeriod ?? 0} new
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-none border-border/80">
                    <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        {t.totalReels}
                      </CardTitle>
                      <Clapperboard className="w-4 h-4 text-purple-500" />
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                      <div className="text-xl font-bold">{metrics?.content?.totalReels?.toLocaleString() ?? 0}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        +{metrics?.content?.newReelsInPeriod ?? 0} new
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-none border-border/80">
                    <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        {t.pendingReports}
                      </CardTitle>
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                      <div className="text-xl font-bold text-destructive">
                        {metrics?.moderation?.pendingReports ?? 0}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {metrics?.moderation?.totalReports ?? 0} total reports
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-none border-border/80">
                    <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        {t.totalFeedback}
                      </CardTitle>
                      <MessageSquare className="w-4 h-4 text-teal-500" />
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                      <div className="text-xl font-bold">{metrics?.moderation?.totalFeedback ?? 0}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {metrics?.moderation?.pendingFeedback ?? 0} pending tickets
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Main Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* User Signups Timeline */}
                  <Card className="shadow-none border-border/80">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <span>{t.userGrowth}</span>
                        <Badge variant="outline" className="text-[10px] font-normal">
                          Daily Registrations
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                            <XAxis
                              dataKey="date"
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
                              tickFormatter={(val) => val.slice(5)}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
                              allowDecimals={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="users"
                              name="Signups"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#userGrad)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Content Creation Timeline */}
                  <Card className="shadow-none border-border/80">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <span>{t.contentCreation}</span>
                        <Badge variant="outline" className="text-[10px] font-normal">
                          Posts vs. Reels
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                            <XAxis
                              dataKey="date"
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
                              tickFormatter={(val) => val.slice(5)}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
                              allowDecimals={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                            <Bar dataKey="posts" name="Posts" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="reels" name="Reels" fill="#a855f7" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Queues Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Verification Queue Card */}
                  <Card className="shadow-none border-border/80">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold text-foreground">
                          {t.verification}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {(metrics as any)?.verification?.pending ?? 0} pending manual requests
                        </CardDescription>
                      </div>
                      <Link href="/admin/verification">
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1 text-primary">
                          <span>View All</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BadgeCheck className="w-4 h-4 text-primary" />
                          <span className="text-xs font-medium">Receipts & Slips</span>
                        </div>
                        <Badge variant="default" className="text-xs font-bold">
                          {(metrics as any)?.verification?.paymentSubmitted ?? 0} paid
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Groups Directory Card */}
                  <Card className="shadow-none border-border/80">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold text-foreground">
                          {t.groups}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {(metrics as any)?.groups?.total ?? 0} total chat groups
                        </CardDescription>
                      </div>
                      <Link href="/admin/groups">
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1 text-primary">
                          <span>View All</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users2 className="w-4 h-4 text-purple-500" />
                          <span className="text-xs font-medium">Join Inquiries</span>
                        </div>
                        <Badge variant="secondary">
                          {(metrics as any)?.groups?.pendingJoinRequests ?? 0}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Reports Queue Card */}
                  <Card className="shadow-none border-border/80">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold text-foreground">
                          {t.pendingReports}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {metrics?.moderation?.pendingReports || 0} reports waiting for review
                        </CardDescription>
                      </div>
                      <Link href="/admin/reports">
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1 text-primary">
                          <span>View All</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          <span className="text-xs font-medium">Pending Moderation</span>
                        </div>
                        <Badge variant="destructive">
                          {metrics?.moderation?.pendingReports || 0}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Feedback Queue Card */}
                  <Card className="shadow-none border-border/80">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold text-foreground">
                          {t.feedback} Tickets
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {metrics?.moderation?.pendingFeedback || 0} open user tickets
                        </CardDescription>
                      </div>
                      <Link href="/admin/feedback">
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1 text-primary">
                          <span>View All</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-500" />
                          <span className="text-xs font-medium">Open User Inquiries</span>
                        </div>
                        <Badge variant="secondary">
                          {metrics?.moderation?.pendingFeedback || 0}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminLayout activeTab="dashboard">
      <AdminDashboardContent />
    </AdminLayout>
  );
}
