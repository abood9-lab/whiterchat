import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  CreditCard,
  Building2,
  FileText,
  Upload,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  XCircle,
  RefreshCw,
  Star,
  Zap,
  ArrowRight,
  Info,
  Calendar,
  Wallet,
  CheckCheck,
  History,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Plan {
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  badgeType: string;
  perks: string[];
  isActive: boolean;
  isPopular?: boolean;
}

interface VerificationStatusData {
  isVerified: boolean;
  badge: string;
  planName: string | null;
  expiresAt: string | null;
  startedAt: string | null;
  status: string;
  latestRequest: any;
  defaultPaymentConfig: any;
}

interface RequestHistoryItem {
  _id: string;
  status: string;
  createdAt: string;
  reviewedAt?: string;
  planSnapshot?: {
    name: string;
    price: number;
    currency: string;
    durationDays: number;
    badgeType: string;
  };
  planId?: {
    name: string;
    price: number;
    currency: string;
    durationDays: number;
  };
  userProof?: {
    transactionId?: string;
    submittedAt?: string;
  };
  adminNotes?: string;
}

export function VerificationSection() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [statusData, setStatusData] = useState<VerificationStatusData | null>(null);
  const [history, setHistory] = useState<RequestHistoryItem[]>([]);

  // Selection Confirmation Modal
  const [planToConfirm, setPlanToConfirm] = useState<Plan | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);

  // Payment Proof Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [userNote, setUserNote] = useState("");
  const [proofImageBase64, setProofImageBase64] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Copy Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Cancellation State
  const [isCancelling, setIsCancelling] = useState(false);

  const getAuthToken = () =>
    localStorage.getItem("pixlr_token") ||
    localStorage.getItem("whiterchat_token") ||
    "";

  const fetchStatusAndPlans = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const [plansRes, statusRes, historyRes] = await Promise.all([
        fetch(apiUrl("/api/verification/plans")),
        fetch(apiUrl("/api/verification/my-status"), { headers }),
        fetch(apiUrl("/api/verification/history"), { headers }),
      ]);

      if (plansRes.ok) {
        const pData = await plansRes.json();
        setPlans(pData.plans || []);
      }

      if (statusRes.ok) {
        const sData = await statusRes.json();
        setStatusData(sData);
      }

      if (historyRes.ok) {
        const hData = await historyRes.json();
        setHistory(hData.history || []);
      }
    } catch {
      toast({
        title: "Network error",
        description: "Could not load verification status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndPlans();
  }, []);

  const handleSelectPlan = (plan: Plan) => {
    setPlanToConfirm(plan);
    setConfirmModalOpen(true);
  };

  const handleConfirmRequest = async () => {
    if (!planToConfirm) return;
    setIsSubmittingReq(true);
    try {
      const token = getAuthToken();
      const res = await fetch(apiUrl("/api/verification/request"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ planId: planToConfirm._id }),
      });

      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Verification Request Created",
          description: "Your request is registered. Please review payment instructions below.",
        });
        setConfirmModalOpen(false);
        await fetchStatusAndPlans();
      } else {
        toast({
          title: "Request Failed",
          description: data.error || "Unable to create verification request.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Connection Error",
        description: "Failed to connect to the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size must be under 5 MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPaymentProof = async (e: React.FormEvent) => {
    e.preventDefault();
    const requestId = statusData?.latestRequest?._id;
    if (!requestId) {
      toast({ title: "No active request found", variant: "destructive" });
      return;
    }

    if (!transactionId.trim()) {
      toast({
        title: "Missing Transaction ID",
        description: "Please enter the transfer reference or transaction ID.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const token = getAuthToken();
      const res = await fetch(apiUrl("/api/verification/submit-payment"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          requestId,
          transactionId: transactionId.trim(),
          proofImageData: proofImageBase64,
          userNote: userNote.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Payment Proof Submitted",
          description: "Our compliance team will manually audit your receipt and approve your badge.",
        });
        setPayModalOpen(false);
        setTransactionId("");
        setUserNote("");
        setProofImageBase64("");
        await fetchStatusAndPlans();
      } else {
        toast({
          title: "Submission Error",
          description: data.error || "Failed to submit payment proof.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error submitting payment",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to cancel this verification request?")) return;
    setIsCancelling(true);
    try {
      const token = getAuthToken();
      const res = await fetch(apiUrl("/api/verification/cancel"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ requestId }),
      });
      if (res.ok) {
        toast({
          title: "Request Cancelled",
          description: "Your verification request has been cancelled.",
        });
        await fetchStatusAndPlans();
      } else {
        const data = await res.json();
        toast({
          title: "Cancellation Failed",
          description: data.error || "Could not cancel request.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error cancelling request", variant: "destructive" });
    } finally {
      setIsCancelling(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedKey(null), 2500);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading verification status...</p>
      </div>
    );
  }

  const latestReq = statusData?.latestRequest;
  const isVerified = Boolean(statusData?.isVerified);
  const isPending = latestReq?.status === "pending";
  const isPaymentSubmitted = latestReq?.status === "payment_submitted";
  const isRejected = latestReq?.status === "rejected";
  const isExpired = statusData?.status === "expired";

  // Determine active instructions to display
  const paymentDetails = latestReq?.paymentDetails || latestReq?.paymentInstructions || statusData?.defaultPaymentConfig;

  // Calculate days remaining if verified
  let daysRemaining: number | null = null;
  if (isVerified && statusData?.expiresAt) {
    const diffMs = new Date(statusData.expiresAt).getTime() - new Date().getTime();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* ─── 1. Header & Hero ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <BadgeCheck className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Verification & Badges
              </h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              Stand out with a verified WhiterChat profile. Obtain an authentic badge, priority discovery, and exclusive creator capabilities.
            </p>
          </div>

          {/* Current Status Indicator */}
          <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Current Status
            </span>
            {isVerified ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 text-xs font-semibold gap-1.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Active
              </Badge>
            ) : isPaymentSubmitted ? (
              <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 px-3 py-1 text-xs font-semibold gap-1.5 rounded-full">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                Payment Under Review
              </Badge>
            ) : isPending ? (
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-3 py-1 text-xs font-semibold gap-1.5 rounded-full">
                <Clock className="w-3.5 h-3.5" />
                Awaiting Payment
              </Badge>
            ) : isRejected ? (
              <Badge className="bg-destructive/10 text-destructive border border-destructive/30 px-3 py-1 text-xs font-semibold gap-1.5 rounded-full">
                <XCircle className="w-3.5 h-3.5" />
                Request Rejected
              </Badge>
            ) : isExpired ? (
              <Badge className="bg-muted text-muted-foreground border border-border px-3 py-1 text-xs font-semibold gap-1.5 rounded-full">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Subscription Expired
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground px-3 py-1 text-xs font-medium rounded-full">
                Not Verified
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. Verified Active Banner ─────────────────────────────────── */}
      {isVerified && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
              <BadgeCheck className="w-7 h-7" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-foreground">
                  Your Account is Officially Verified
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
                  {statusData?.planName || "Verified Member"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your profile carries the distinguished verification mark across comments, reels, search results, and direct messages.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-emerald-500/20">
            <div className="p-3 rounded-xl bg-card border border-border/60">
              <span className="text-muted-foreground block text-[11px]">Badge Type</span>
              <span className="font-semibold text-foreground capitalize mt-0.5 block">
                {statusData?.badge ? statusData.badge.replace("_", " ") : "Blue Check"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border/60">
              <span className="text-muted-foreground block text-[11px]">Expiration Date</span>
              <span className="font-semibold text-foreground mt-0.5 block">
                {statusData?.expiresAt
                  ? new Date(statusData.expiresAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "Active (Lifetime)"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border/60">
              <span className="text-muted-foreground block text-[11px]">Remaining Time</span>
              <span className="font-semibold text-foreground mt-0.5 block">
                {daysRemaining !== null ? `${daysRemaining} days left` : "Unlimited"}
              </span>
            </div>
          </div>

          {daysRemaining !== null && daysRemaining <= 7 && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Your badge expires in {daysRemaining} days. Renew now to avoid interruption.</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                onClick={() => {
                  const firstPlan = plans[0];
                  if (firstPlan) handleSelectPlan(firstPlan);
                }}
              >
                Renew Badge
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── 3. Visual Status Timeline ─────────────────────────────────── */}
      {(isPending || isPaymentSubmitted || isRejected) && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Verification Progress
            </h2>
            <span className="text-xs text-muted-foreground">
              Request ID: <span className="font-mono text-[11px]">{latestReq?._id?.slice(-8)}</span>
            </span>
          </div>

          {/* Timeline steps */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
            {/* Step 1: Request Submitted */}
            <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 relative">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">1. Request Submitted</p>
                <p className="text-[11px] text-muted-foreground">
                  {latestReq?.createdAt ? new Date(latestReq.createdAt).toLocaleDateString() : "Completed"}
                </p>
              </div>
            </div>

            {/* Step 2: Payment Details */}
            <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 relative">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  isPaymentSubmitted
                    ? "bg-emerald-500 text-white"
                    : isPending
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isPaymentSubmitted ? <Check className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">2. Manual Payment</p>
                <p className="text-[11px] text-muted-foreground">
                  {isPaymentSubmitted ? "Transferred" : isPending ? "Action Required" : "Pending"}
                </p>
              </div>
            </div>

            {/* Step 3: Payment Proof Submitted */}
            <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 relative">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  isPaymentSubmitted
                    ? "bg-blue-500 text-white ring-4 ring-blue-500/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isPaymentSubmitted ? <Clock className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">3. Payment Submitted</p>
                <p className="text-[11px] text-muted-foreground">
                  {isPaymentSubmitted ? "Auditing receipt" : "Awaiting submission"}
                </p>
              </div>
            </div>

            {/* Step 4: Admin Audit & Grant */}
            <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 relative">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  isRejected ? "bg-destructive text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {isRejected ? <XCircle className="w-4 h-4" /> : <BadgeCheck className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {isRejected ? "Rejected" : "4. Badge Approved"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {isRejected ? "See admin notes" : "Final activation"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. Active Request Card: Awaiting Payment or Under Review ─── */}
      {isPending && paymentDetails && (
        <div className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Manual Payment Instructions</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Please transfer the plan fee to our official wallet/CliQ address. Once paid, click "Confirm Payment" below.
              </p>
            </div>
            <div className="text-start sm:text-end shrink-0">
              <span className="text-[11px] text-muted-foreground block">Plan Amount</span>
              <span className="text-lg font-bold text-foreground">
                {latestReq?.planSnapshot?.price ?? latestReq?.planId?.price ?? "--"}{" "}
                {latestReq?.planSnapshot?.currency ?? latestReq?.planId?.currency ?? "JOD"}
              </span>
            </div>
          </div>

          {/* Payment Credentials Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Wallet / CliQ Address */}
            <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between gap-3">
              <div className="space-y-1 overflow-hidden">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  CliQ Alias / Wallet Address
                </span>
                <span className="font-mono text-sm font-bold text-foreground select-all truncate block">
                  {paymentDetails.walletAddress || "WHITERCHAT@CLIQ"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-8 gap-1.5 text-xs"
                onClick={() => copyToClipboard(paymentDetails.walletAddress || "WHITERCHAT@CLIQ", "wallet")}
              >
                {copiedKey === "wallet" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === "wallet" ? "Copied" : "Copy"}
              </Button>
            </div>

            {/* Account / Service Name */}
            <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between gap-3">
              <div className="space-y-1 overflow-hidden">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Payment Method & Beneficiary
                </span>
                <span className="text-sm font-semibold text-foreground truncate block">
                  {paymentDetails.paymentMethodName || paymentDetails.walletName || "CliQ Jordan / Digital Wallet"}
                </span>
              </div>
              <Building2 className="w-5 h-5 text-muted-foreground/60 shrink-0" />
            </div>
          </div>

          {/* Instructions Notes */}
          {paymentDetails.instructions && (
            <div className="p-4 rounded-xl bg-muted/50 border border-border/80 text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
              <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-primary" /> Step-by-step instructions:
              </p>
              {paymentDetails.instructions}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-destructive w-full sm:w-auto"
              disabled={isCancelling}
              onClick={() => handleCancelRequest(latestReq._id)}
            >
              {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
              Cancel Request
            </Button>

            <Button
              onClick={() => setPayModalOpen(true)}
              className="w-full sm:w-auto px-6 font-semibold shadow-md shadow-primary/20 gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Payment ("I've Paid")
            </Button>
          </div>
        </div>
      )}

      {/* ─── 5. Payment Submitted State Banner ────────────────────────── */}
      {isPaymentSubmitted && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6 space-y-3">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <Clock className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                Payment Proof Received — Under Manual Review
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Thank you for submitting your transaction details. Our administration team is manually verifying the bank transfer. Once confirmed, your verification badge will activate automatically.
              </p>
              {latestReq?.userProof?.transactionId && (
                <div className="pt-2 text-xs">
                  <span className="text-muted-foreground">Transaction Reference: </span>
                  <span className="font-mono font-semibold text-foreground">
                    {latestReq.userProof.transactionId}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. Rejected State Notice ─────────────────────────────────── */}
      {isRejected && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-3">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive shrink-0">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-base font-bold text-foreground">Verification Request Rejected</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {latestReq?.adminNotes
                  ? `Reason provided: ${latestReq.adminNotes}`
                  : "Your verification request could not be approved. You may submit a new request below."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. Available Verification Plans ───────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">Available Verification Plans</h2>
          <p className="text-xs text-muted-foreground">
            Select the plan that fits your creator or organization profile. All verifications are audited manually.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {plans.map((plan) => {
            const isCurrentlySelected = latestReq?.planId?._id === plan._id;
            return (
              <div
                key={plan._id}
                className={`relative rounded-2xl border bg-card p-6 flex flex-col justify-between transition-all ${
                  plan.isPopular
                    ? "border-primary shadow-lg shadow-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-border/80"
                }`}
              >
                {plan.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold tracking-wide uppercase px-3 py-0.5 rounded-full shadow-sm">
                    Most Popular
                  </span>
                )}

                <div className="space-y-4">
                  {/* Plan Badge & Title */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-foreground">{plan.name}</span>
                      <BadgeCheck
                        className={`w-5 h-5 ${
                          plan.badgeType === "gold_badge" ? "text-amber-500 fill-amber-500/20" : "text-primary"
                        }`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed min-h-[32px]">
                      {plan.description}
                    </p>
                  </div>

                  {/* Pricing (Always from backend) */}
                  <div className="py-2 border-y border-border/60">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
                        {plan.price}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {plan.currency}
                      </span>
                      <span className="text-[11px] text-muted-foreground/80 ml-1">
                        / {plan.durationDays} days
                      </span>
                    </div>
                  </div>

                  {/* Perks List */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Included Benefits
                    </span>
                    <ul className="space-y-2 text-xs text-foreground/90">
                      {plan.perks?.map((perk, i) => (
                        <li key={i} className="flex items-start gap-2 leading-snug">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Plan Action CTA */}
                <div className="pt-6">
                  {isVerified ? (
                    <Button
                      variant="outline"
                      className="w-full text-xs font-semibold"
                      onClick={() => handleSelectPlan(plan)}
                    >
                      Renew With This Plan
                    </Button>
                  ) : isPending || isPaymentSubmitted ? (
                    <Button
                      variant="secondary"
                      disabled={isCurrentlySelected}
                      className="w-full text-xs font-semibold"
                      onClick={() => handleSelectPlan(plan)}
                    >
                      {isCurrentlySelected ? "Current Selection" : "Switch Plan"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSelectPlan(plan)}
                      variant={plan.isPopular ? "default" : "outline"}
                      className="w-full text-xs font-semibold"
                    >
                      Request Verification
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 8. Request History ────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">Verification History</h3>
          </div>

          <div className="divide-y divide-border/60">
            {history.map((item) => (
              <div key={item._id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {item.planSnapshot?.name || item.planId?.name || "Verification Plan"}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground font-mono">
                      {item.planSnapshot?.price || item.planId?.price}{" "}
                      {item.planSnapshot?.currency || item.planId?.currency || "JOD"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Requested on {new Date(item.createdAt).toLocaleDateString()}
                    {item.userProof?.transactionId && ` · Ref: ${item.userProof.transactionId}`}
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className={`capitalize text-[11px] px-2.5 py-0.5 rounded-full ${
                    item.status === "approved"
                      ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/5"
                      : item.status === "rejected"
                      ? "border-destructive/40 text-destructive bg-destructive/5"
                      : item.status === "payment_submitted"
                      ? "border-blue-500/40 text-blue-600 bg-blue-500/5"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {item.status.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Confirmation Modal: Plan Selected ────────────────────────── */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto p-3 rounded-2xl bg-primary/10 text-primary mb-2">
              <BadgeCheck className="w-8 h-8" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              Request Verification Plan
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground pt-1">
              Please review the plan details before proceeding. Submitting a request initiates manual auditing.
            </DialogDescription>
          </DialogHeader>

          {planToConfirm && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3.5 rounded-xl bg-muted/50 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-sm">{planToConfirm.name}</span>
                  <span className="font-bold text-foreground text-sm">
                    {planToConfirm.price} {planToConfirm.currency}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span>Duration: {planToConfirm.durationDays} days</span>
                  <span className="capitalize">Badge: {planToConfirm.badgeType.replace("_", " ")}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-[11px] leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>Important:</strong> Submitting a verification request does not verify your account automatically. You will receive manual payment instructions, and our compliance team will audit your payment receipt before activating your badge.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
              disabled={isSubmittingReq}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRequest}
              disabled={isSubmittingReq}
              className="text-xs font-semibold gap-1.5"
            >
              {isSubmittingReq ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              Proceed to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Payment Proof Modal ("I've Paid") ─────────────────────────── */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="mx-auto p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              Confirm Payment Details
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground pt-1">
              Submitting this does not confirm your payment. Your receipt will be reviewed manually by the WhiterChat team.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitPaymentProof} className="space-y-4 pt-1">
            {/* Transaction Reference ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Transaction Reference ID *</span>
                <span className="text-[10px] text-muted-foreground">Required</span>
              </label>
              <Input
                placeholder="e.g. CLIQ-2026-987456 or bank ref"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                required
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Found on your banking or mobile wallet payment confirmation slip.
              </p>
            </div>

            {/* Receipt Screenshot Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Transfer Receipt Slip</span>
                <span className="text-[10px] text-muted-foreground">Optional</span>
              </label>

              {proofImageBase64 ? (
                <div className="relative rounded-xl border border-border p-2 bg-muted/30 flex items-center gap-3">
                  <img
                    src={proofImageBase64}
                    alt="Receipt Preview"
                    className="w-14 h-14 object-cover rounded-lg border border-border"
                  />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-medium text-foreground truncate">Receipt image attached</p>
                    <p className="text-[10px] text-muted-foreground">Ready for manual verification</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setProofImageBase64("")}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors bg-muted/20">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Click to upload screenshot</span>
                  <span className="text-[10px] text-muted-foreground">PNG, JPG, or WEBP up to 5 MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>

            {/* Optional Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Note for Administrator</span>
                <span className="text-[10px] text-muted-foreground">Optional</span>
              </label>
              <Textarea
                placeholder="Any details to help our team match your payment (e.g. sender bank or account name)..."
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPayModalOpen(false)}
                disabled={isSubmittingPayment}
                className="text-xs"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingPayment || !transactionId.trim()}
                className="text-xs font-semibold gap-1.5"
              >
                {isSubmittingPayment ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Submit for Audit
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
