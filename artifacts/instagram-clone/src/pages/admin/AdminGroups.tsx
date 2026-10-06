import { useState, useEffect } from "react";
import { AdminLayout, useAdmin } from "./AdminLayout";
import { adminApi } from "./admin-api";
import { ADMIN_STRINGS } from "./admin-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Users2,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Globe,
  UserCheck,
  UserX,
  AlertTriangle,
  RefreshCw,
  Search,
  Trash2,
  Eye,
  Ban,
  CheckCircle2,
  Clock,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminGroups() {
  const { lang, token } = useAdmin();
  const t = ADMIN_STRINGS[lang];
  const isRtl = lang === "ar";

  // Tab State
  const [currentTab, setCurrentTab] = useState("groups");

  // Groups list state
  const [groups, setGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [privacyFilter, setPrivacyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);
  const [groupCounts, setGroupCounts] = useState({
    total: 0,
    active: 0,
    disabled: 0,
    pendingJoinRequests: 0,
  });

  // 360 Group Details Modal
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Disable / Suspend Modal
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [groupToSuspend, setGroupToSuspend] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendLoading, setSuspendLoading] = useState(false);

  // Restore Modal
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [groupToRestore, setGroupToRestore] = useState<any>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Join Requests Audit state
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestStatusFilter, setRequestStatusFilter] = useState("pending");

  const fetchGroups = async () => {
    try {
      setLoadingGroups(true);
      const res = await adminApi.getGroups(
        {
          search: searchQuery.trim() || undefined,
          privacy: privacyFilter !== "all" ? privacyFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          page,
          limit: 20,
        },
        token
      );
      setGroups(res.groups || []);
      setTotalGroups(res.total || 0);
      if (res.counts) setGroupCounts(res.counts);
    } catch (err: any) {
      toast.error(err.message || "Failed to load groups");
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchJoinRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await adminApi.getAllGroupJoinRequests(
        {
          status: requestStatusFilter,
          page: 1,
          limit: 50,
        },
        token
      );
      setJoinRequests(res.requests || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load join requests");
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [privacyFilter, statusFilter, page]);

  useEffect(() => {
    if (currentTab === "requests") fetchJoinRequests();
  }, [currentTab, requestStatusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchGroups();
  };

  const handleOpenDetails = async (id: string) => {
    try {
      setSelectedGroupId(id);
      setLoadingDetails(true);
      const res = await adminApi.getGroupDetails(id, token);
      setGroupDetails(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load group details");
      setSelectedGroupId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleExecuteSuspend = async () => {
    if (!groupToSuspend) return;
    try {
      setSuspendLoading(true);
      await adminApi.disableGroup(groupToSuspend.id || groupToSuspend._id, { reason: suspendReason }, token);
      toast.success(isRtl ? `تم تعليق المجموعة بنجاح` : `Group suspended successfully`);
      setSuspendModalOpen(false);
      setGroupToSuspend(null);
      fetchGroups();
      if (selectedGroupId) handleOpenDetails(selectedGroupId);
    } catch (err: any) {
      toast.error(err.message || "Failed to suspend group");
    } finally {
      setSuspendLoading(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!groupToRestore) return;
    try {
      setRestoreLoading(true);
      await adminApi.restoreGroup(groupToRestore.id || groupToRestore._id, token);
      toast.success(isRtl ? `تم إلغاء تعليق المجموعة وإعادتها للخدمة` : `Group restored successfully`);
      setRestoreModalOpen(false);
      setGroupToRestore(null);
      fetchGroups();
      if (selectedGroupId) handleOpenDetails(selectedGroupId);
    } catch (err: any) {
      toast.error(err.message || "Failed to restore group");
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!groupToDelete) return;
    try {
      setDeleteLoading(true);
      await adminApi.deleteGroup(groupToDelete.id || groupToDelete._id, token);
      toast.success(isRtl ? `تم حذف المجموعة ورسائلها نهائياً` : `Group deleted permanently`);
      setDeleteModalOpen(false);
      setGroupToDelete(null);
      setSelectedGroupId(null);
      fetchGroups();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete group");
    } finally {
      setDeleteLoading(false);
    }
  };

  const getPrivacyBadge = (privacy: string) => {
    switch (privacy) {
      case "public":
        return <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 flex items-center gap-1"><Globe className="w-3 h-3" /> {isRtl ? "عام ومفتوح" : "Public"}</Badge>;
      case "approval_required":
        return <Badge variant="outline" className="border-blue-500/40 text-blue-600 bg-blue-500/10 flex items-center gap-1"><UserCheck className="w-3 h-3" /> {isRtl ? "يتطلب موافقة" : "Approval Req."}</Badge>;
      case "private":
        return <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/10 flex items-center gap-1"><Lock className="w-3 h-3" /> {isRtl ? "خاص" : "Private"}</Badge>;
      default:
        return <Badge variant="secondary">{privacy}</Badge>;
    }
  };

  return (
    <AdminLayout activeTab="groups">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
              <Users2 className="w-7 h-7 text-primary" />
              <span>{isRtl ? "إدارة المجموعات والرقابة" : "Group Directory & Moderation"}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRtl
                ? "مراقبة كافة مجموعات الدردشة، ضبط إعدادات الخصوصية، تعليق المجموعات المخالفة، ومراجعة طلبات الانضمام"
                : "Audit all platform groups, privacy controls, member rosters, join requests, and moderate violations"}
            </p>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={() => {
              if (currentTab === "groups") fetchGroups();
              if (currentTab === "requests") fetchJoinRequests();
            }}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            {isRtl ? "تحديث" : "Refresh"}
          </Button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{isRtl ? "إجمالي المجموعات" : "Total Groups"}</span>
              <Users2 className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold mt-2">{groupCounts.total}</div>
          </div>
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{isRtl ? "المجموعات النشطة" : "Active Groups"}</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{groupCounts.active}</div>
          </div>
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-destructive font-semibold">{isRtl ? "المجموعات المعلقة" : "Suspended Groups"}</span>
              <ShieldAlert className="w-4 h-4 text-destructive" />
            </div>
            <div className="text-2xl font-bold text-destructive mt-2">{groupCounts.disabled}</div>
          </div>
          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{isRtl ? "طلبات الانضمام المعلقة" : "Pending Join Requests"}</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">{groupCounts.pendingJoinRequests}</div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-xs">
            <TabsTrigger value="groups" className="text-xs font-semibold">
              {isRtl ? "دليل المجموعات" : "Groups Directory"}
            </TabsTrigger>
            <TabsTrigger value="requests" className="text-xs font-semibold">
              {isRtl ? "طلبات الانضمام" : "Join Requests"}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: ALL GROUPS */}
          <TabsContent value="groups" className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-xl border border-border">
              <form onSubmit={handleSearchSubmit} className="flex-1 w-full sm:max-w-md flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={isRtl ? "ابحث باسم المجموعة أو الوصف..." : "Search group name or description..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <Button type="submit" size="sm" variant="secondary" className="h-9 text-xs">
                  {isRtl ? "بحث" : "Search"}
                </Button>
              </form>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                <Select value={privacyFilter} onValueChange={(val) => { setPrivacyFilter(val); setPage(1); }}>
                  <SelectTrigger className="w-[150px] h-9 text-xs">
                    <SelectValue placeholder="Privacy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRtl ? "كافة الخصوصيات" : "All Privacies"}</SelectItem>
                    <SelectItem value="public">{isRtl ? "عام" : "Public"}</SelectItem>
                    <SelectItem value="approval_required">{isRtl ? "موافقة مطلوبة" : "Approval Req."}</SelectItem>
                    <SelectItem value="private">{isRtl ? "خاص" : "Private"}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRtl ? "كافة الحالات" : "All Statuses"}</SelectItem>
                    <SelectItem value="active">{isRtl ? "نشطة فقط" : "Active Only"}</SelectItem>
                    <SelectItem value="disabled">{isRtl ? "معلقة فقط" : "Suspended Only"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Groups Table */}
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-secondary/40 border-b border-border text-muted-foreground uppercase text-[11px] font-semibold tracking-wider">
                    <tr>
                      <th className="py-3 px-4">{isRtl ? "المجموعة" : "Group"}</th>
                      <th className="py-3 px-4">{isRtl ? "الخصوصية" : "Privacy"}</th>
                      <th className="py-3 px-4">{isRtl ? "الأعضاء والإدارة" : "Members / Admins"}</th>
                      <th className="py-3 px-4">{isRtl ? "المنشئ" : "Created By"}</th>
                      <th className="py-3 px-4">{isRtl ? "الحالة والرقابة" : "Status / Reports"}</th>
                      <th className="py-3 px-4 text-right">{isRtl ? "الإجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loadingGroups ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                          <span>{t.loading}</span>
                        </td>
                      </tr>
                    ) : groups.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground">
                          <Users2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <span>{t.noData}</span>
                        </td>
                      </tr>
                    ) : (
                      groups.map((g) => (
                        <tr key={g.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-9 h-9 rounded-xl border border-border">
                                <AvatarImage src={g.groupAvatarUrl} />
                                <AvatarFallback className="rounded-xl font-bold bg-primary/10 text-primary">
                                  {g.groupName?.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-bold text-foreground flex items-center gap-1.5">
                                  <span>{g.groupName}</span>
                                  {g.isDisabled && (
                                    <Badge variant="destructive" className="text-[9px] h-4 px-1 py-0 uppercase">
                                      {isRtl ? "معلقة" : "Suspended"}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                                  {g.groupDescription || "No description provided"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {getPrivacyBadge(g.privacy)}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-foreground">{g.memberCount} {isRtl ? "عضو" : "members"}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {g.adminCount} admins • {g.moderatorCount} mods {g.bannedCount > 0 ? `• ${g.bannedCount} banned` : ""}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {g.createdBy ? (
                              <div className="flex items-center gap-1.5">
                                <Avatar className="w-5 h-5 rounded-full">
                                  <AvatarImage src={g.createdBy.avatarUrl} />
                                  <AvatarFallback>{g.createdBy.username?.slice(0, 1)}</AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-foreground">@{g.createdBy.username}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              {g.pendingReportsCount > 0 ? (
                                <Badge variant="destructive" className="text-[10px] flex items-center gap-1 w-fit">
                                  <AlertTriangle className="w-3 h-3" />
                                  {g.pendingReportsCount} {isRtl ? "بلاغات معلقة" : "reports"}
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                  {isRtl ? "لا توجد مخالفات" : "Good Standing"}
                                </span>
                              )}
                              {g.pendingJoinRequestsCount > 0 && (
                                <div className="text-[10px] text-blue-500 font-medium">
                                  {g.pendingJoinRequestsCount} {isRtl ? "طلبات انضمام" : "join requests"}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDetails(g.id)}
                                className="h-7 text-xs"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                {isRtl ? "تفاصيل" : "Details"}
                              </Button>

                              {g.isDisabled ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setGroupToRestore(g);
                                    setRestoreModalOpen(true);
                                  }}
                                  className="h-7 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                                >
                                  <ShieldCheck className="w-3 h-3 mr-1" />
                                  {isRtl ? "إلغاء التعليق" : "Restore"}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setGroupToSuspend(g);
                                    setSuspendReason("");
                                    setSuspendModalOpen(true);
                                  }}
                                  className="h-7 text-xs text-amber-600 hover:bg-amber-500/10"
                                >
                                  <Ban className="w-3 h-3 mr-1" />
                                  {isRtl ? "تعليق" : "Suspend"}
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setGroupToDelete(g);
                                  setDeleteModalOpen(true);
                                }}
                                className="h-7 text-xs text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: PLATFORM JOIN REQUESTS AUDIT */}
          <TabsContent value="requests" className="space-y-4">
            <div className="flex items-center justify-between bg-card p-3 rounded-xl border border-border">
              <div className="text-xs text-muted-foreground">
                {isRtl ? "مراجعة كافة طلبات الانضمام المرسلة للمجموعات ذات الخصوصية 'يتطلب موافقة'" : "Audit log of users waiting for group admission approval"}
              </div>
              <Select value={requestStatusFilter} onValueChange={setRequestStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{isRtl ? "معلقة فقط" : "Pending Only"}</SelectItem>
                  <SelectItem value="approved">{isRtl ? "مقبولة" : "Approved"}</SelectItem>
                  <SelectItem value="rejected">{isRtl ? "مرفوضة" : "Rejected"}</SelectItem>
                  <SelectItem value="all">{isRtl ? "الكل" : "All"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-secondary/40 border-b border-border text-muted-foreground uppercase text-[11px] font-semibold tracking-wider">
                    <tr>
                      <th className="py-3 px-4">{isRtl ? "المستخدم المتقدم" : "Applicant"}</th>
                      <th className="py-3 px-4">{isRtl ? "المجموعة المستهدفة" : "Target Group"}</th>
                      <th className="py-3 px-4">{isRtl ? "الحالة" : "Status"}</th>
                      <th className="py-3 px-4">{isRtl ? "تاريخ الطلب" : "Requested At"}</th>
                      <th className="py-3 px-4">{isRtl ? "المُراجع" : "Reviewed By"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loadingRequests ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-muted-foreground">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                          <span>{t.loading}</span>
                        </td>
                      </tr>
                    ) : joinRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-muted-foreground">
                          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <span>{t.noData}</span>
                        </td>
                      </tr>
                    ) : (
                      joinRequests.map((r) => (
                        <tr key={r._id} className="hover:bg-secondary/20">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={r.userId?.avatarUrl} />
                                <AvatarFallback>{r.userId?.username?.slice(0, 1)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-foreground">@{r.userId?.username || "Unknown"}</div>
                                <div className="text-[10px] text-muted-foreground">{r.userId?.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            {r.groupId?.groupName || "Unnamed Group"}
                          </td>
                          <td className="py-3.5 px-4">
                            {r.status === "pending" && <Badge variant="outline" className="border-amber-500 text-amber-500 bg-amber-500/10 text-[10px]">{isRtl ? "معلق" : "Pending"}</Badge>}
                            {r.status === "approved" && <Badge variant="outline" className="border-emerald-500 text-emerald-500 bg-emerald-500/10 text-[10px]">{isRtl ? "مقبول" : "Approved"}</Badge>}
                            {r.status === "rejected" && <Badge variant="outline" className="border-destructive text-destructive bg-destructive/10 text-[10px]">{isRtl ? "مرفوض" : "Rejected"}</Badge>}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                            {r.reviewedBy ? `@${r.reviewedBy.username}` : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL: 360 GROUP DETAILS */}
      <Dialog open={Boolean(selectedGroupId)} onOpenChange={(open) => { if (!open) { setSelectedGroupId(null); setGroupDetails(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users2 className="w-5 h-5 text-primary" />
              <span>{isRtl ? "تفاصيل المجموعة الكاملة" : "Group 360 Moderation View"}</span>
            </DialogTitle>
          </DialogHeader>

          {loadingDetails || !groupDetails ? (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              <span>{t.loading}</span>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {/* Top Banner */}
              <div className="flex items-start justify-between p-4 rounded-2xl border bg-secondary/30">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 rounded-xl border">
                    <AvatarImage src={groupDetails.group.groupAvatarUrl} />
                    <AvatarFallback className="rounded-xl font-bold text-base bg-primary/10 text-primary">
                      {groupDetails.group.groupName?.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-base">{groupDetails.group.groupName}</h3>
                    <div className="text-xs text-muted-foreground mt-0.5">{groupDetails.group.groupDescription || "No description"}</div>
                    <div className="flex items-center gap-2 mt-2">
                      {getPrivacyBadge(groupDetails.group.privacy)}
                      <span className="text-xs text-muted-foreground">• {groupDetails.group.memberCount} {isRtl ? "عضو" : "members"}</span>
                    </div>
                  </div>
                </div>

                {groupDetails.group.isDisabled ? (
                  <Badge variant="destructive">{isRtl ? "مجموعة معلقة" : "Suspended"}</Badge>
                ) : (
                  <Badge variant="default" className="bg-emerald-600">{isRtl ? "نشطة" : "Active"}</Badge>
                )}
              </div>

              {/* Suspension Reason Warning */}
              {groupDetails.group.isDisabled && (
                <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-xs space-y-1">
                  <div className="font-bold text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    {isRtl ? "سبب التعليق من الإدارة:" : "Suspension Notice:"}
                  </div>
                  <div className="text-destructive font-semibold">{groupDetails.group.disabledReason}</div>
                </div>
              )}

              {/* Admin & Moderator Roster */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {isRtl ? "إدارة المجموعة (Admins & Mods)" : "Group Leadership"}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(groupDetails.group.admins || []).map((admin: any) => (
                    <div key={admin._id} className="flex items-center justify-between p-2 rounded-xl border bg-card text-xs">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={admin.avatarUrl} />
                          <AvatarFallback>{admin.username?.slice(0, 1)}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">@{admin.username}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{isRtl ? "مدير" : "Admin"}</Badge>
                    </div>
                  ))}
                  {(groupDetails.group.moderators || []).map((mod: any) => (
                    <div key={mod._id} className="flex items-center justify-between p-2 rounded-xl border bg-card text-xs">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={mod.avatarUrl} />
                          <AvatarFallback>{mod.username?.slice(0, 1)}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">@{mod.username}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{isRtl ? "مشرف" : "Moderator"}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Banned Users */}
              {groupDetails.group.bannedUsers && groupDetails.group.bannedUsers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-destructive">
                    {isRtl ? "المستخدمون المحظورون من المجموعة" : "Banned Users in Group"}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {groupDetails.group.bannedUsers.map((bUser: any) => (
                      <Badge key={bUser._id} variant="destructive" className="text-xs">
                        @{bUser.username}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Reports Against Group */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>{isRtl ? "سجل البلاغات ضد هذه المجموعة" : "Reports against this Group"}</span>
                  <span className="text-foreground">({groupDetails.reports?.length || 0})</span>
                </div>
                {groupDetails.reports?.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-3 rounded-xl border bg-secondary/20 text-center">
                    {isRtl ? "لا توجد بلاغات مسجلة ضد المجموعة" : "No violation reports recorded"}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {groupDetails.reports.map((rep: any) => (
                      <div key={rep._id} className="p-2.5 rounded-xl border border-destructive/20 bg-destructive/5 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-destructive">{rep.reason}</span>
                          {rep.details && <span className="text-muted-foreground ml-1.5">({rep.details})</span>}
                        </div>
                        <Badge variant="outline" className="text-[10px]">{rep.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {groupDetails?.group?.isDisabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setGroupToRestore(groupDetails.group);
                  setRestoreModalOpen(true);
                }}
                className="text-emerald-600 border-emerald-500/30"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                {isRtl ? "استعادة المجموعة" : "Restore Group"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setGroupToSuspend(groupDetails?.group);
                  setSuspendReason("");
                  setSuspendModalOpen(true);
                }}
                className="text-amber-600 border-amber-500/30"
              >
                <Ban className="w-3.5 h-3.5 mr-1" />
                {isRtl ? "تعليق المجموعة" : "Suspend Group"}
              </Button>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setGroupToDelete(groupDetails?.group);
                setDeleteModalOpen(true);
              }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              {isRtl ? "حذف نهائي" : "Delete Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: SUSPEND GROUP */}
      <Dialog open={suspendModalOpen} onOpenChange={setSuspendModalOpen}>
        <DialogContent className="max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="w-5 h-5" />
              <span>{isRtl ? "تعليق مجموعة دردشة" : "Suspend Group"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {groupToSuspend?.groupName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              {isRtl
                ? "سيتم قفل المجموعة فوراً ومنع إرسال أي رسائل، وإشعار مالك المجموعة بسبب الإجراء مع تسجيله في سجل التدقيق."
                : "The group will be locked immediately, messaging will be disabled, and the owner will receive a notification."}
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-destructive">{isRtl ? "سبب التعليق" : "Suspension Reason"}</label>
              <Input
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder={isRtl ? "مخالفة إرشادات المحتوى / سلوك مسيء..." : "Community guideline violations / Harassment..."}
                className="text-xs"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSuspendModalOpen(false)}>
              {t.cancel}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleExecuteSuspend} disabled={suspendLoading || !suspendReason.trim()}>
              {suspendLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              {isRtl ? "تأكيد تعليق المجموعة" : "Confirm Suspension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: RESTORE GROUP */}
      <Dialog open={restoreModalOpen} onOpenChange={setRestoreModalOpen}>
        <DialogContent className="max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
              <span>{isRtl ? "استعادة وإعادة تفعيل المجموعة" : "Restore Group"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {groupToRestore?.groupName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              {isRtl
                ? "سيتم إعادة تفعيل المجموعة فوراً وإتاحة إرسال الرسائل للأعضاء وإشعار المالك."
                : "The group will be unlocked, messaging will be re-enabled, and the owner will be notified."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRestoreModalOpen(false)}>
              {t.cancel}
            </Button>
            <Button variant="default" size="sm" onClick={handleExecuteRestore} disabled={restoreLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {restoreLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              {isRtl ? "تأكيد الاستعادة" : "Confirm Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: DELETE GROUP */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              <span>{isRtl ? "حذف المجموعة نهائياً" : "Delete Group Permanently"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {groupToDelete?.groupName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-destructive font-semibold">
              {isRtl
                ? "تحذير: سيتم حذف كافة رسائل المجموعة وسجل الانضمام نهائياً من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء."
                : "Warning: All messages, media, and membership records of this group will be deleted permanently."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteModalOpen(false)}>
              {t.cancel}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleExecuteDelete} disabled={deleteLoading}>
              {deleteLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              {isRtl ? "تأكيد الحذف النهائي" : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
