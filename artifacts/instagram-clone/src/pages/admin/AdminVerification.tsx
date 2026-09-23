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
  BadgeCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  CreditCard,
  AlertCircle,
  FileText,
  UserCheck,
  UserX,
  Building2,
  Wallet,
  DollarSign,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminVerification() {
  const { lang, token } = useAdmin();
  const t = ADMIN_STRINGS[lang];
  const isRtl = lang === "ar";

  // Tab State
  const [currentTab, setCurrentTab] = useState("requests");

  // Requests State
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const [requestCounts, setRequestCounts] = useState({
    pending: 0,
    awaiting_payment: 0,
    payment_submitted: 0,
    approved: 0,
    rejected: 0,
  });

  // Selected Request Modal & Action
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionType, setActionType] = useState<"instructions" | "approve" | "reject" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Send Instructions form
  const [instrMethod, setInstrMethod] = useState("CliQ / Zain Cash (Jordan)");
  const [instrWallet, setInstrWallet] = useState("CliQ Jordan");
  const [instrAddress, setInstrAddress] = useState("WHITERCHAT@CLIQ");
  const [instrCurrency, setInstrCurrency] = useState("JOD");
  const [instrText, setInstrText] = useState("");
  const [instrNotes, setInstrNotes] = useState("");

  // Approval / Rejection notes
  const [actionReason, setActionReason] = useState("");
  const [actionNotes, setActionNotes] = useState("");

  // Plans State
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    price: 5,
    currency: "JOD",
    durationDays: 30,
    badgeType: "blue_check",
    perks: "",
    isActive: true,
    isPopular: false,
    order: 0,
  });

  // Payment Config State
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    paymentMethodName: "",
    walletName: "",
    walletAddress: "",
    currency: "JOD",
    instructions: "",
    additionalNotes: "",
    isActive: true,
  });

  // Manual Grant State
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [selectedUserToGrant, setSelectedUserToGrant] = useState<any>(null);
  const [grantForm, setGrantForm] = useState({
    badgeType: "blue_check",
    planName: "VIP / Partner Verified",
    durationDays: 365,
    reason: "Direct Grant by Platform Admin",
  });
  const [grantLoading, setGrantLoading] = useState(false);

  // Revoke Modal State
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [selectedUserToRevoke, setSelectedUserToRevoke] = useState<any>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Load Requests
  const fetchRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await adminApi.getVerificationRequests(
        {
          status: statusFilter !== "all" ? statusFilter : undefined,
          search: searchQuery.trim() || undefined,
          page,
          limit: 20,
        },
        token
      );
      setRequests(res.requests || []);
      setTotalRequests(res.total || 0);
      if (res.counts) {
        setRequestCounts(res.counts);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load verification requests");
    } finally {
      setLoadingRequests(false);
    }
  };

  // Load Plans
  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const res = await adminApi.getVerificationPlans(token);
      setPlans(res.plans || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load verification plans");
    } finally {
      setLoadingPlans(false);
    }
  };

  // Load Payment Config
  const fetchPaymentConfig = async () => {
    try {
      setLoadingConfig(true);
      const res = await adminApi.getVerificationPaymentConfig(token);
      if (res.config) {
        setPaymentConfig(res.config);
        setConfigForm({
          paymentMethodName: res.config.paymentMethodName || "CliQ & Mobile Wallet (Jordan)",
          walletName: res.config.walletName || "CliQ Jordan / Zain Cash",
          walletAddress: res.config.walletAddress || "WHITERCHAT@CLIQ",
          currency: res.config.currency || "JOD",
          instructions: res.config.instructions || "",
          additionalNotes: res.config.additionalNotes || "",
          isActive: res.config.isActive !== false,
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load payment instructions");
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, page]);

  useEffect(() => {
    if (currentTab === "plans") fetchPlans();
    if (currentTab === "payment-config") fetchPaymentConfig();
  }, [currentTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRequests();
  };

  // Open Action Modal
  const openActionModal = (req: any, type: "instructions" | "approve" | "reject") => {
    setSelectedRequest(req);
    setActionType(type);
    setActionReason("");
    setActionNotes("");

    if (type === "instructions") {
      setInstrMethod(paymentConfig?.paymentMethodName || "CliQ & Mobile Wallet (Jordan)");
      setInstrWallet(paymentConfig?.walletName || "CliQ Jordan / Zain Cash");
      setInstrAddress(paymentConfig?.walletAddress || "WHITERCHAT@CLIQ");
      setInstrCurrency(req.planSnapshot?.currency || "JOD");
      setInstrText(
        paymentConfig?.instructions ||
          `Send ${req.planSnapshot?.price} ${req.planSnapshot?.currency} to alias: WHITERCHAT@CLIQ and click 'I Have Paid' with your transaction reference.`
      );
      setInstrNotes(paymentConfig?.additionalNotes || "Manual verification is verified by Admin within 15-60 mins.");
    }
  };

  // Execute Action
  const handleExecuteAction = async () => {
    if (!selectedRequest || !actionType) return;
    try {
      setActionLoading(true);
      if (actionType === "instructions") {
        await adminApi.sendVerificationInstructions(
          selectedRequest._id,
          {
            methodName: instrMethod,
            walletName: instrWallet,
            walletAddress: instrAddress,
            currency: instrCurrency,
            instructions: instrText,
            additionalNotes: instrNotes,
          },
          token
        );
        toast.success(isRtl ? "تم إرسال تعليمات الدفع للمستخدم" : "Payment instructions sent to user");
      } else if (actionType === "approve") {
        await adminApi.approveVerificationRequest(
          selectedRequest._id,
          { notes: actionNotes },
          token
        );
        toast.success(isRtl ? "تم توثيق الحساب وتفعيل الشارة بنجاح!" : "Verification approved! User is now verified.");
      } else if (actionType === "reject") {
        await adminApi.rejectVerificationRequest(
          selectedRequest._id,
          { reason: actionReason, notes: actionNotes },
          token
        );
        toast.success(isRtl ? "تم رفض الطلب وإشعار المستخدم" : "Request rejected and user notified.");
      }

      setSelectedRequest(null);
      setActionType(null);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to process request");
    } finally {
      setActionLoading(false);
    }
  };

  // Plan Save
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const perksArr = planForm.perks
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean);

      const payload = {
        ...planForm,
        perks: perksArr,
      };

      if (editingPlan) {
        await adminApi.updateVerificationPlan(editingPlan._id, payload, token);
        toast.success(isRtl ? "تم تحديث الباقة بنجاح" : "Plan updated successfully");
      } else {
        await adminApi.createVerificationPlan(payload, token);
        toast.success(isRtl ? "تم إنشاء باقة التوثيق بنجاح" : "Plan created successfully");
      }

      setPlanModalOpen(false);
      setEditingPlan(null);
      fetchPlans();
    } catch (err: any) {
      toast.error(err.message || "Failed to save plan");
    }
  };

  // Delete Plan
  const handleDeletePlan = async (id: string, name: string) => {
    if (!confirm(isRtl ? `هل أنت متأكد من حذف باقة "${name}"؟` : `Are you sure you want to delete "${name}" plan?`)) return;
    try {
      await adminApi.deleteVerificationPlan(id, token);
      toast.success(isRtl ? "تم حذف الباقة" : "Plan deleted");
      fetchPlans();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete plan");
    }
  };

  // Payment Config Save
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingConfig(true);
      await adminApi.updateVerificationPaymentConfig(configForm, token);
      toast.success(isRtl ? "تم حفظ إعدادات الدفع اليدوي بنجاح" : "Payment configuration saved");
      fetchPaymentConfig();
    } catch (err: any) {
      toast.error(err.message || "Failed to save payment config");
    } finally {
      setSavingConfig(false);
    }
  };

  // Direct User Search for Manual Grant
  const handleSearchUsers = async () => {
    if (!userSearchQuery.trim()) return;
    try {
      const res = await adminApi.getUsers({ search: userSearchQuery.trim(), limit: 10 }, token);
      setSearchedUsers(res.users || []);
    } catch (err: any) {
      toast.error("Failed to search users");
    }
  };

  const handleExecuteGrant = async () => {
    if (!selectedUserToGrant) return;
    try {
      setGrantLoading(true);
      await adminApi.grantManualVerification(selectedUserToGrant._id || selectedUserToGrant.id, grantForm, token);
      toast.success(isRtl ? `تم توثيق حساب @${selectedUserToGrant.username} بنجاح` : `Badge granted to @${selectedUserToGrant.username}`);
      setGrantModalOpen(false);
      setSelectedUserToGrant(null);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to grant verification");
    } finally {
      setGrantLoading(false);
    }
  };

  const handleExecuteRevoke = async () => {
    if (!selectedUserToRevoke) return;
    try {
      setRevokeLoading(true);
      await adminApi.revokeUserVerification(selectedUserToRevoke._id || selectedUserToRevoke.id, { reason: revokeReason }, token);
      toast.success(isRtl ? `تم إلغاء توثيق @${selectedUserToRevoke.username}` : `Verification revoked from @${selectedUserToRevoke.username}`);
      setRevokeModalOpen(false);
      setSelectedUserToRevoke(null);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke verification");
    } finally {
      setRevokeLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/10 flex items-center gap-1"><Clock className="w-3 h-3" /> {isRtl ? "طلب جديد" : "Pending"}</Badge>;
      case "awaiting_payment":
        return <Badge variant="outline" className="border-blue-500/40 text-blue-500 bg-blue-500/10 flex items-center gap-1"><Send className="w-3 h-3" /> {isRtl ? "بانتظار الدفع" : "Awaiting Payment"}</Badge>;
      case "payment_submitted":
        return <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 bg-emerald-500/10 font-bold flex items-center gap-1 animate-pulse"><CreditCard className="w-3 h-3" /> {isRtl ? "تم الدفع (مطلوب مراجعة الإيصال)" : "Payment Submitted"}</Badge>;
      case "approved":
        return <Badge variant="outline" className="border-green-500/40 text-green-500 bg-green-500/10 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {isRtl ? "تمت الموافقة" : "Approved"}</Badge>;
      case "rejected":
        return <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10 flex items-center gap-1"><XCircle className="w-3 h-3" /> {isRtl ? "مرفوض" : "Rejected"}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout activeTab="verification">
      <div className="space-y-6">
        {/* Top Header & Overview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
              <BadgeCheck className="w-7 h-7 text-primary" />
              <span>{isRtl ? "نظام التوثيق اليدوي والشارات" : "Manual Verification & Badge Center"}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRtl
                ? "إدارة طلبات التوثيق اليدوي، إرسال تعليمات الدفع عبر CliQ/المحافظ، مراجعة الإيصالات، ومنح الشارات"
                : "Manage manual verification workflow, CliQ payment instructions, receipt audits, plans, and badges"}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setUserSearchQuery("");
                setSearchedUsers([]);
                setSelectedUserToGrant(null);
                setGrantModalOpen(true);
              }}
              className="font-medium text-xs shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
              {isRtl ? "منح توثيق مباشر" : "Direct Grant Badge"}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (currentTab === "requests") fetchRequests();
                if (currentTab === "plans") fetchPlans();
                if (currentTab === "payment-config") fetchPaymentConfig();
              }}
              className="text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              {isRtl ? "تحديث" : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{isRtl ? "طلبات جديدة" : "New Requests"}</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold mt-2">{requestCounts.pending}</div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{isRtl ? "بانتظار الدفع" : "Awaiting Pay"}</span>
              <Send className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold mt-2">{requestCounts.awaiting_payment}</div>
          </div>
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                {isRtl ? "إيصالات دفع مدخلة" : "Payment Submitted"}
              </span>
              <CreditCard className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              {requestCounts.payment_submitted}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{isRtl ? "تم توثيقها" : "Approved"}</span>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold mt-2">{requestCounts.approved}</div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{isRtl ? "مرفوضة" : "Rejected"}</span>
              <XCircle className="w-4 h-4 text-destructive" />
            </div>
            <div className="text-2xl font-bold mt-2">{requestCounts.rejected}</div>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="requests" className="text-xs font-semibold">
              {isRtl ? "طلبات التوثيق" : "Requests Queue"}
            </TabsTrigger>
            <TabsTrigger value="plans" className="text-xs font-semibold">
              {isRtl ? "باقات التوثيق" : "Plans"}
            </TabsTrigger>
            <TabsTrigger value="payment-config" className="text-xs font-semibold">
              {isRtl ? "تعليمات الدفع (CliQ)" : "Payment Setup"}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: REQUESTS */}
          <TabsContent value="requests" className="space-y-4">
            {/* Filters bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-xl border border-border">
              <form onSubmit={handleSearchSubmit} className="flex-1 w-full sm:max-w-md flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={isRtl ? "ابحث باسم المستخدم أو البريد..." : "Search username, name, email..."}
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
                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <SelectValue placeholder={isRtl ? "تصفية حسب الحالة" : "Filter by Status"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRtl ? "كافة الحالات" : "All Statuses"}</SelectItem>
                    <SelectItem value="pending">{isRtl ? "طلبات جديدة" : "Pending"}</SelectItem>
                    <SelectItem value="awaiting_payment">{isRtl ? "بانتظار الدفع" : "Awaiting Payment"}</SelectItem>
                    <SelectItem value="payment_submitted">{isRtl ? "تم تقديم الدفع (عاجل)" : "Payment Submitted (Urgent)"}</SelectItem>
                    <SelectItem value="approved">{isRtl ? "تمت الموافقة" : "Approved"}</SelectItem>
                    <SelectItem value="rejected">{isRtl ? "مرفوضة" : "Rejected"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Requests Table */}
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-secondary/40 border-b border-border text-muted-foreground uppercase text-[11px] font-semibold tracking-wider">
                    <tr>
                      <th className="py-3 px-4">{isRtl ? "المستخدم" : "User"}</th>
                      <th className="py-3 px-4">{isRtl ? "الباقة والمبلغ" : "Plan & Price"}</th>
                      <th className="py-3 px-4">{isRtl ? "الحالة" : "Status"}</th>
                      <th className="py-3 px-4">{isRtl ? "بيانات الدفع / الإيصال" : "Payment Proof"}</th>
                      <th className="py-3 px-4">{isRtl ? "تاريخ الطلب" : "Submitted"}</th>
                      <th className="py-3 px-4 text-right">{isRtl ? "الإجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loadingRequests ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                          <span>{t.loading}</span>
                        </td>
                      </tr>
                    ) : requests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground">
                          <BadgeCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <span>{t.noData}</span>
                        </td>
                      </tr>
                    ) : (
                      requests.map((req) => {
                        const u = req.userId || {};
                        return (
                          <tr key={req._id} className="hover:bg-secondary/20 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8 rounded-full border border-border">
                                  <AvatarImage src={u.avatarUrl} />
                                  <AvatarFallback>{u.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-1 font-semibold text-foreground">
                                    <span>{u.fullName || u.username}</span>
                                    {u.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-primary fill-primary/20" />}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">@{u.username} • {u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-semibold">{req.planSnapshot?.name || "Standard Plan"}</div>
                              <div className="text-muted-foreground text-[11px]">
                                {req.planSnapshot?.price} {req.planSnapshot?.currency || "JOD"} / {req.planSnapshot?.durationDays} days
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              {getStatusBadge(req.status)}
                            </td>
                            <td className="py-3.5 px-4">
                              {req.paymentProof ? (
                                <div className="space-y-0.5">
                                  <div className="font-mono text-[11px] font-bold text-foreground">
                                    Ref: {req.paymentProof.referenceNumber || "N/A"}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                                    {req.paymentProof.payerNote || req.paymentProof.senderWalletName || "Receipt Attached"}
                                  </div>
                                </div>
                              ) : req.status === "awaiting_payment" ? (
                                <span className="text-[11px] text-blue-500 font-medium">
                                  {isRtl ? "تم إرسال تعليمات CliQ" : "Instructions Sent"}
                                </span>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                              {new Date(req.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {req.status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openActionModal(req, "instructions")}
                                    className="h-7 text-xs border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                                  >
                                    <Send className="w-3 h-3 mr-1" />
                                    {isRtl ? "تعليمات الدفع" : "Send CliQ"}
                                  </Button>
                                )}

                                {(req.status === "pending" || req.status === "awaiting_payment" || req.status === "payment_submitted") && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => openActionModal(req, "approve")}
                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                  >
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    {isRtl ? "توثيق" : "Approve"}
                                  </Button>
                                )}

                                {req.status !== "rejected" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openActionModal(req, "reject")}
                                    className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    {isRtl ? "رفض" : "Reject"}
                                  </Button>
                                )}

                                {u.isVerified && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedUserToRevoke(u);
                                      setRevokeReason("");
                                      setRevokeModalOpen(true);
                                    }}
                                    className="h-7 text-xs text-amber-600 hover:bg-amber-500/10"
                                  >
                                    <UserX className="w-3 h-3 mr-1" />
                                    {isRtl ? "إلغاء الشارة" : "Revoke"}
                                  </Button>
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
            </div>
          </TabsContent>

          {/* TAB 2: PLANS */}
          <TabsContent value="plans" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">{isRtl ? "باقات التوثيق الرسمية" : "Verification Packages"}</h3>
                <p className="text-xs text-muted-foreground">{isRtl ? "تحديد الأسعار والمدد والمزايا لكل نوع شارة" : "Set prices, durations, and perks for each verification tier"}</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingPlan(null);
                  setPlanForm({
                    name: "",
                    description: "",
                    price: 5,
                    currency: "JOD",
                    durationDays: 30,
                    badgeType: "blue_check",
                    perks: "Verified Badge\nPriority Support\nDirect Group Invites",
                    isActive: true,
                    isPopular: false,
                    order: 0,
                  });
                  setPlanModalOpen(true);
                }}
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {isRtl ? "إضافة باقة جديدة" : "New Plan"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {loadingPlans ? (
                <div className="col-span-3 py-12 text-center text-muted-foreground">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  <span>{t.loading}</span>
                </div>
              ) : plans.length === 0 ? (
                <div className="col-span-3 py-12 text-center text-muted-foreground border border-dashed rounded-xl">
                  <span>{isRtl ? "لا توجد باقات معرفة حالياً" : "No plans defined yet"}</span>
                </div>
              ) : (
                plans.map((p) => (
                  <div key={p._id} className={cn("p-5 rounded-2xl border bg-card relative flex flex-col justify-between shadow-sm", p.isPopular ? "border-primary/50 shadow-primary/5" : "border-border")}>
                    {p.isPopular && (
                      <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider font-bold">
                        {isRtl ? "الأكثر طلباً" : "Popular"}
                      </Badge>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <BadgeCheck className="w-5 h-5 text-primary" />
                          <h4 className="font-bold text-base">{p.name}</h4>
                        </div>
                        <Badge variant={p.isActive ? "default" : "secondary"} className="text-[10px]">
                          {p.isActive ? (isRtl ? "مفعلة" : "Active") : (isRtl ? "معطلة" : "Disabled")}
                        </Badge>
                      </div>

                      <div className="flex items-baseline gap-1 my-3">
                        <span className="text-3xl font-extrabold tracking-tight">{p.price}</span>
                        <span className="text-sm font-semibold text-muted-foreground">{p.currency}</span>
                        <span className="text-xs text-muted-foreground">/ {p.durationDays} {isRtl ? "يوم" : "days"}</span>
                      </div>

                      <p className="text-xs text-muted-foreground mb-4 min-h-[32px]">{p.description || "—"}</p>

                      <div className="space-y-1.5 border-t border-border/60 pt-3">
                        <div className="text-[11px] font-bold text-muted-foreground uppercase">{isRtl ? "المزايا" : "Perks"}:</div>
                        {(p.perks || []).map((perk: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{perk}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingPlan(p);
                          setPlanForm({
                            name: p.name,
                            description: p.description || "",
                            price: p.price,
                            currency: p.currency || "JOD",
                            durationDays: p.durationDays || 30,
                            badgeType: p.badgeType || "blue_check",
                            perks: (p.perks || []).join("\n"),
                            isActive: p.isActive !== false,
                            isPopular: Boolean(p.isPopular),
                            order: p.order || 0,
                          });
                          setPlanModalOpen(true);
                        }}
                        className="h-8 text-xs"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        {isRtl ? "تعديل" : "Edit"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePlan(p._id, p.name)}
                        className="h-8 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* TAB 3: PAYMENT CONFIG (CLIQ & WALLET) */}
          <TabsContent value="payment-config" className="space-y-4">
            <div className="max-w-2xl bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">{isRtl ? "إعدادات الدفع اليدوي (CliQ / محافظ الأردن)" : "Manual Payment Setup (CliQ & Wallets)"}</h3>
                  <p className="text-xs text-muted-foreground">{isRtl ? "البيانات التي تظهر للمستخدمين عند طلب التوثيق لدفع الرسوم يدوياً" : "Information presented to users when submitting manual payments"}</p>
                </div>
              </div>

              {loadingConfig ? (
                <div className="py-12 text-center text-muted-foreground">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  <span>{t.loading}</span>
                </div>
              ) : (
                <form onSubmit={handleSaveConfig} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">{isRtl ? "اسم طريقة الدفع" : "Payment Method Name"}</label>
                      <Input
                        value={configForm.paymentMethodName}
                        onChange={(e) => setConfigForm({ ...configForm, paymentMethodName: e.target.value })}
                        placeholder="CliQ & Mobile Wallet (Jordan)"
                        className="text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">{isRtl ? "الجهة أو البنك / المحفظة" : "Wallet / Provider Name"}</label>
                      <Input
                        value={configForm.walletName}
                        onChange={(e) => setConfigForm({ ...configForm, walletName: e.target.value })}
                        placeholder="CliQ Jordan / Zain Cash"
                        className="text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-primary font-mono">{isRtl ? "معرف التحويل (CliQ Alias / Phone)" : "CliQ Alias / Account Number"}</label>
                      <Input
                        value={configForm.walletAddress}
                        onChange={(e) => setConfigForm({ ...configForm, walletAddress: e.target.value })}
                        placeholder="WHITERCHAT@CLIQ"
                        className="text-xs font-mono font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">{isRtl ? "العملة الافتراضية" : "Default Currency"}</label>
                      <Input
                        value={configForm.currency}
                        onChange={(e) => setConfigForm({ ...configForm, currency: e.target.value })}
                        placeholder="JOD"
                        className="text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">{isRtl ? "خطوات وتعليمات التحويل للمستخدم" : "Transfer Instructions (Shown to User)"}</label>
                    <Textarea
                      rows={4}
                      value={configForm.instructions}
                      onChange={(e) => setConfigForm({ ...configForm, instructions: e.target.value })}
                      placeholder="1. Open your banking app...&#10;2. Transfer to CliQ Alias...&#10;3. Click I've Paid..."
                      className="text-xs font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">{isRtl ? "ملاحظات إضافية (أوقات المراجعة)" : "Additional Notes (Audit SLA)"}</label>
                    <Input
                      value={configForm.additionalNotes}
                      onChange={(e) => setConfigForm({ ...configForm, additionalNotes: e.target.value })}
                      placeholder="Manual verification takes 15 mins to 2 hours."
                      className="text-xs"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button type="submit" disabled={savingConfig} className="font-semibold text-xs">
                      {savingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                      {isRtl ? "حفظ إعدادات CliQ" : "Save Payment Instructions"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL: ACTION DIALOG (Instructions, Approve, Reject) */}
      <Dialog open={Boolean(selectedRequest && actionType)} onOpenChange={(open) => { if (!open) { setSelectedRequest(null); setActionType(null); } }}>
        <DialogContent className="max-w-lg" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "instructions" && <Send className="w-5 h-5 text-blue-500" />}
              {actionType === "approve" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              {actionType === "reject" && <XCircle className="w-5 h-5 text-destructive" />}
              <span>
                {actionType === "instructions" && (isRtl ? "إرسال تعليمات الدفع للمستخدم" : "Send CliQ Payment Instructions")}
                {actionType === "approve" && (isRtl ? "الموافقة على توثيق الحساب" : "Approve Verification Request")}
                {actionType === "reject" && (isRtl ? "رفض طلب التوثيق" : "Reject Verification Request")}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedRequest?.userId?.username && `@${selectedRequest.userId.username} • ${selectedRequest.planSnapshot?.name}`}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-2">
              {/* If APPROVING: show receipt preview if available */}
              {actionType === "approve" && selectedRequest.paymentProof && (
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1.5">
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    {isRtl ? "بيانات الإيصال المدخلة من المستخدم" : "Receipt Submitted by User"}
                  </div>
                  <div className="text-xs font-mono font-bold">
                    Ref ID: {selectedRequest.paymentProof.referenceNumber || "None"}
                  </div>
                  {selectedRequest.paymentProof.payerNote && (
                    <div className="text-xs text-muted-foreground">
                      Note: {selectedRequest.paymentProof.payerNote}
                    </div>
                  )}
                  {selectedRequest.paymentProof.senderWalletName && (
                    <div className="text-xs text-muted-foreground">
                      Wallet: {selectedRequest.paymentProof.senderWalletName}
                    </div>
                  )}
                </div>
              )}

              {/* INSTRUCTIONS FORM */}
              {actionType === "instructions" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">{isRtl ? "معرف الدفع (CliQ Alias)" : "CliQ Alias / Address"}</label>
                    <Input
                      value={instrAddress}
                      onChange={(e) => setInstrAddress(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">{isRtl ? "تعليمات التحويل" : "Instructions"}</label>
                    <Textarea
                      rows={3}
                      value={instrText}
                      onChange={(e) => setInstrText(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">{isRtl ? "ملاحظة" : "Note"}</label>
                    <Input
                      value={instrNotes}
                      onChange={(e) => setInstrNotes(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}

              {/* REJECT FORM */}
              {actionType === "reject" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-destructive">{isRtl ? "سبب الرفض (يصل للمستخدم في الإشعار)" : "Rejection Reason (Sent to User)"}</label>
                    <Input
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder={isRtl ? "لم يتم التحقق من صحة الإيصال / المبلغ غير مطابق..." : "Receipt verification failed / Invalid reference..."}
                      className="text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">{isRtl ? "ملاحظات الإدارة الداخلية" : "Internal Admin Notes"}</label>
                    <Textarea
                      rows={2}
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder={isRtl ? "سبب إضافي لسجل التدقيق..." : "Audit log notes..."}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}

              {/* APPROVE FORM */}
              {actionType === "approve" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-secondary/50 text-xs space-y-1">
                    <div>{isRtl ? "نوع الشارة الممنوحة:" : "Badge Granted:"} <span className="font-bold text-primary">{selectedRequest.planSnapshot?.badgeType || "blue_check"}</span></div>
                    <div>{isRtl ? "المدة:" : "Duration:"} <span className="font-bold">{selectedRequest.planSnapshot?.durationDays || 30} {isRtl ? "يوم" : "days"}</span></div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">{isRtl ? "ملاحظات الموافقة (اختياري)" : "Approval Notes (Optional)"}</label>
                    <Input
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder={isRtl ? "تم التحقق من إيداع CliQ بنجاح" : "CliQ transfer verified by admin"}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedRequest(null); setActionType(null); }}
              disabled={actionLoading}
            >
              {t.cancel}
            </Button>
            <Button
              size="sm"
              variant={actionType === "reject" ? "destructive" : "default"}
              onClick={handleExecuteAction}
              disabled={actionLoading || (actionType === "reject" && !actionReason.trim())}
            >
              {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              {actionType === "instructions" && (isRtl ? "إرسال الآن" : "Send Instructions")}
              {actionType === "approve" && (isRtl ? "تأكيد وتوثيق الحساب" : "Confirm & Verify")}
              {actionType === "reject" && (isRtl ? "تأكيد الرفض" : "Confirm Reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: PLAN CREATE / EDIT */}
      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-primary" />
              <span>{editingPlan ? (isRtl ? "تعديل باقة التوثيق" : "Edit Plan") : (isRtl ? "إنشاء باقة توثيق جديدة" : "New Verification Plan")}</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSavePlan} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRtl ? "اسم الباقة" : "Plan Name"}</label>
              <Input
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                placeholder="Blue Verified / Gold Creator"
                className="text-xs"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">{isRtl ? "السعر" : "Price"}</label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={planForm.price}
                  onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
                  className="text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">{isRtl ? "العملة" : "Currency"}</label>
                <Input
                  value={planForm.currency}
                  onChange={(e) => setPlanForm({ ...planForm, currency: e.target.value })}
                  placeholder="JOD"
                  className="text-xs"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">{isRtl ? "المدة (أيام)" : "Duration (Days)"}</label>
                <Input
                  type="number"
                  min="1"
                  value={planForm.durationDays}
                  onChange={(e) => setPlanForm({ ...planForm, durationDays: parseInt(e.target.value, 10) || 30 })}
                  className="text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">{isRtl ? "نوع الشارة" : "Badge Type"}</label>
                <Select value={planForm.badgeType} onValueChange={(val) => setPlanForm({ ...planForm, badgeType: val })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue_check">{isRtl ? "شارة زرقاء (Blue Check)" : "Blue Check"}</SelectItem>
                    <SelectItem value="gold_check">{isRtl ? "شارة ذهبية (Gold VIP)" : "Gold VIP"}</SelectItem>
                    <SelectItem value="verified_business">{isRtl ? "شارة أعمال (Business)" : "Business"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRtl ? "الوصف" : "Description"}</label>
              <Input
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                placeholder="Official checkmark for creators and verified figures."
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRtl ? "المزايا (سطر لكل ميزة)" : "Perks (One per line)"}</label>
              <Textarea
                rows={3}
                value={planForm.perks}
                onChange={(e) => setPlanForm({ ...planForm, perks: e.target.value })}
                placeholder="Official Blue Badge&#10;Priority In Search&#10;Direct Support"
                className="text-xs"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <label className="text-xs flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planForm.isActive}
                  onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                  className="rounded"
                />
                <span>{isRtl ? "الباقة نشطة ومتاحة للشراء" : "Active for purchase"}</span>
              </label>
              <label className="text-xs flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planForm.isPopular}
                  onChange={(e) => setPlanForm({ ...planForm, isPopular: e.target.checked })}
                  className="rounded"
                />
                <span>{isRtl ? "تمييز كأكثر طلباً" : "Feature as Popular"}</span>
              </label>
            </div>
            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setPlanModalOpen(false)}>
                {t.cancel}
              </Button>
              <Button type="submit" size="sm">
                {isRtl ? "حفظ الباقة" : "Save Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: DIRECT GRANT VERIFICATION */}
      <Dialog open={grantModalOpen} onOpenChange={setGrantModalOpen}>
        <DialogContent className="max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>{isRtl ? "منح توثيق وشارة مباشرة لمستخدم" : "Direct Grant Verification Badge"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isRtl ? "منح الشارة مباشرة دون الحاجة لطلب أو دفع، للمشاهير والشركاء والمؤسسات." : "Directly grant verified badge to influencers, partners, or VIPs."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            {!selectedUserToGrant ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold">{isRtl ? "ابحث عن المستخدم" : "Search User"}</label>
                <div className="flex gap-2">
                  <Input
                    placeholder={isRtl ? "اسم المستخدم أو البريد..." : "Username or email..."}
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="text-xs"
                  />
                  <Button type="button" size="sm" onClick={handleSearchUsers}>
                    <Search className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-border border rounded-xl p-1">
                  {searchedUsers.length === 0 ? (
                    <div className="text-center py-4 text-xs text-muted-foreground">{isRtl ? "ابحث لاختيار مستخدم" : "Search to select user"}</div>
                  ) : (
                    searchedUsers.map((u) => (
                      <div
                        key={u.id || u._id}
                        onClick={() => setSelectedUserToGrant(u)}
                        className="flex items-center justify-between p-2 hover:bg-secondary/60 rounded-lg cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={u.avatarUrl} />
                            <AvatarFallback>{u.username?.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-semibold">{u.fullName || u.username}</span>
                            <span className="text-muted-foreground ml-1">@{u.username}</span>
                          </div>
                        </div>
                        {u.isVerified ? (
                          <Badge variant="outline" className="text-[10px] text-primary">{isRtl ? "موثق" : "Verified"}</Badge>
                        ) : (
                          <Button size="sm" variant="secondary" className="h-6 text-[10px]">{isRtl ? "اختيار" : "Select"}</Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border bg-secondary/30">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={selectedUserToGrant.avatarUrl} />
                      <AvatarFallback>{selectedUserToGrant.username?.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold text-xs">{selectedUserToGrant.fullName || selectedUserToGrant.username}</div>
                      <div className="text-[11px] text-muted-foreground">@{selectedUserToGrant.username}</div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedUserToGrant(null)} className="h-6 text-xs text-muted-foreground">
                    {isRtl ? "تغيير" : "Change"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">{isRtl ? "نوع الشارة" : "Badge Type"}</label>
                    <Select value={grantForm.badgeType} onValueChange={(val) => setGrantForm({ ...grantForm, badgeType: val })}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blue_check">{isRtl ? "شارة زرقاء (Blue)" : "Blue Check"}</SelectItem>
                        <SelectItem value="gold_check">{isRtl ? "شارة ذهبية (Gold)" : "Gold VIP"}</SelectItem>
                        <SelectItem value="verified_business">{isRtl ? "شارة أعمال (Business)" : "Business"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">{isRtl ? "المدة (أيام)" : "Duration (Days)"}</label>
                    <Input
                      type="number"
                      value={grantForm.durationDays}
                      onChange={(e) => setGrantForm({ ...grantForm, durationDays: parseInt(e.target.value, 10) || 365 })}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">{isRtl ? "اسم الباقة / التعيين" : "Grant Label"}</label>
                  <Input
                    value={grantForm.planName}
                    onChange={(e) => setGrantForm({ ...grantForm, planName: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">{isRtl ? "سبب المنح (لسجل التدقيق)" : "Grant Reason"}</label>
                  <Input
                    value={grantForm.reason}
                    onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setGrantModalOpen(false)}>
              {t.cancel}
            </Button>
            {selectedUserToGrant && (
              <Button size="sm" onClick={handleExecuteGrant} disabled={grantLoading}>
                {grantLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                {isRtl ? "منح التوثيق الآن" : "Grant Badge"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: REVOKE VERIFICATION */}
      <Dialog open={revokeModalOpen} onOpenChange={setRevokeModalOpen}>
        <DialogContent className="max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <UserX className="w-5 h-5" />
              <span>{isRtl ? "إلغاء وسحب شارة التوثيق" : "Revoke Verification Badge"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedUserToRevoke && `@${selectedUserToRevoke.username}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              {isRtl
                ? "سيتم إلغاء الشارة فوراً وإشعار المستخدم بسبب الإلغاء وتوثيق الإجراء في سجل التدقيق."
                : "The badge will be removed immediately, the user will be notified, and this action will be recorded in the audit log."}
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRtl ? "سبب الإلغاء" : "Revocation Reason"}</label>
              <Input
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder={isRtl ? "مخالفة معايير المجتمع / انتهاء الصلاحية..." : "Policy violation / Subscription ended..."}
                className="text-xs"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRevokeModalOpen(false)}>
              {t.cancel}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleExecuteRevoke} disabled={revokeLoading}>
              {revokeLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              {isRtl ? "تأكيد سحب الشارة" : "Confirm Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
