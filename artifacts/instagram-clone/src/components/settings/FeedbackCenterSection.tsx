import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { useAuth } from "@/lib/auth";
import {
  Bug,
  Lightbulb,
  Palette,
  Zap,
  HelpCircle,
  Upload,
  X,
  Star,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertCircle,
  Filter,
  Search,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Send,
  Loader2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FeedbackType = "bug" | "feature" | "ui" | "performance" | "other";
type FeedbackStatus = "submitted" | "under_review" | "in_progress" | "resolved" | "closed";

interface AdminReply {
  adminUsername: string;
  text: string;
  isInternal?: boolean;
  createdAt: string;
}

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  bugDetails?: {
    whatHappened?: string;
    whatExpected?: string;
    stepsToReproduce?: string;
    pageContext?: string;
    browserInfo?: string;
  };
  pageContext?: string;
  attachments?: string[];
  status: FeedbackStatus;
  rating?: number;
  createdAt: string;
  updatedAt: string;
  repliesCount?: number;
  latestReply?: AdminReply;
  adminReplies?: AdminReply[];
  user?: {
    username: string;
    fullName?: string;
    avatarUrl?: string;
    email?: string;
  };
}

export function FeedbackCenterSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeSubTab, setActiveSubTab] = useState<"send" | "mine" | "admin">("send");

  // Form State
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pageContext, setPageContext] = useState(window.location.pathname);
  const [whatHappened, setWhatHappened] = useState("");
  const [whatExpected, setWhatExpected] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [ratingHover, setRatingHover] = useState<number | null>(null);

  // Screenshots
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // User feedback list
  const [myFeedback, setMyFeedback] = useState<FeedbackItem[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Admin section state
  const [adminFeedback, setAdminFeedback] = useState<FeedbackItem[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [adminReplyText, setAdminReplyText] = useState("");
  const [adminReplyInternal, setAdminReplyInternal] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const isAdmin = (user as any)?.role === "admin" || (user as any)?.role === "creator";

  // Auto-detect browser/device info safely
  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    let browser = "Unknown Browser";
    if (ua.indexOf("Firefox") > -1) browser = "Firefox";
    else if (ua.indexOf("Chrome") > -1) browser = "Chrome";
    else if (ua.indexOf("Safari") > -1) browser = "Safari";
    else if (ua.indexOf("Edge") > -1) browser = "Edge";

    const os = navigator.platform || "Web";
    const res = `${window.screen.width}x${window.screen.height}`;
    return `${browser} on ${os} (${res})`;
  };

  // Fetch My Feedback
  const fetchMyFeedback = async () => {
    setLoadingMine(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/feedback/mine"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyFeedback(data);
      }
    } catch {
      toast({ title: "Failed to load past feedback", variant: "destructive" });
    } finally {
      setLoadingMine(false);
    }
  };

  // Fetch Admin Feedback
  const fetchAdminFeedback = async () => {
    setLoadingAdmin(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const queryParams = new URLSearchParams();
      if (statusFilter !== "all") queryParams.set("status", statusFilter);
      if (typeFilter !== "all") queryParams.set("type", typeFilter);
      if (searchQuery.trim()) queryParams.set("q", searchQuery.trim());

      const res = await fetch(apiUrl(`/api/feedback/admin/all?${queryParams.toString()}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminFeedback(data);
      }
    } catch {
      toast({ title: "Failed to load admin feedback", variant: "destructive" });
    } finally {
      setLoadingAdmin(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "mine") {
      fetchMyFeedback();
    } else if (activeSubTab === "admin" && isAdmin) {
      fetchAdminFeedback();
    }
  }, [activeSubTab, statusFilter, typeFilter]);

  // Load Single Feedback Detail
  const openFeedbackDetail = async (item: FeedbackItem) => {
    setSelectedFeedback(item);
    setLoadingDetail(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl(`/api/feedback/${item.id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const full = await res.json();
        setSelectedFeedback(full);
      }
    } catch {
      // fallback to basic item
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle Screenshot Selection
  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file (PNG, JPG, WebP)", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Screenshot size must be under 10MB", variant: "destructive" });
      return;
    }

    setScreenshotName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setScreenshotData(base64);

      // Upload to server
      setUploadingImage(true);
      try {
        const token = localStorage.getItem("whiterchat_token") ?? "";
        const uploadRes = await fetch(apiUrl("/api/feedback/upload"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ data: base64, mimeType: file.type }),
        });

        if (uploadRes.ok) {
          const resData = await uploadRes.json();
          setUploadedUrl(resData.url);
          toast({ title: "Screenshot attached successfully" });
        } else {
          toast({ title: "Failed to upload screenshot", variant: "destructive" });
        }
      } catch {
        toast({ title: "Upload error", variant: "destructive" });
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeScreenshot = () => {
    setScreenshotData(null);
    setScreenshotName(null);
    setUploadedUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit Feedback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Please provide a title", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Please describe your feedback", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const payload: any = {
        type: feedbackType,
        title: title.trim(),
        description: description.trim(),
        pageContext,
        rating,
        attachments: uploadedUrl ? [uploadedUrl] : [],
      };

      if (feedbackType === "bug") {
        payload.bugDetails = {
          whatHappened: whatHappened.trim(),
          whatExpected: whatExpected.trim(),
          stepsToReproduce: stepsToReproduce.trim(),
          pageContext,
          browserInfo: getBrowserInfo(),
        };
      }

      const res = await fetch(apiUrl("/api/feedback"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({
          title: "Feedback Submitted!",
          description: "Thank you for helping us improve WhiterChat. We will review your ticket promptly.",
        });
        // Reset form
        setTitle("");
        setDescription("");
        setWhatHappened("");
        setWhatExpected("");
        setStepsToReproduce("");
        removeScreenshot();
        setActiveSubTab("mine");
      } else {
        const data = await res.json();
        toast({ title: data.error || "Submission failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Admin: Change Status
  const handleAdminStatusChange = async (id: string, newStatus: FeedbackStatus) => {
    setUpdatingStatus(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl(`/api/feedback/admin/${id}/status`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast({ title: `Status updated to ${newStatus.replace("_", " ")}` });
        if (selectedFeedback && selectedFeedback.id === id) {
          setSelectedFeedback({ ...selectedFeedback, status: newStatus });
        }
        fetchAdminFeedback();
      }
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Admin: Add Reply
  const handleAdminReply = async (id: string) => {
    if (!adminReplyText.trim()) return;
    setSubmittingReply(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl(`/api/feedback/admin/${id}/reply`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: adminReplyText.trim(),
          isInternal: adminReplyInternal,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({ title: "Reply added successfully" });
        setAdminReplyText("");
        if (selectedFeedback && selectedFeedback.id === id) {
          const updatedReplies = [...(selectedFeedback.adminReplies || []), data.reply];
          setSelectedFeedback({ ...selectedFeedback, adminReplies: updatedReplies });
        }
      }
    } catch {
      toast({ title: "Failed to add reply", variant: "destructive" });
    } finally {
      setSubmittingReply(false);
    }
  };

  // Status Badge Component
  const getStatusBadge = (status: FeedbackStatus) => {
    const config: Record<FeedbackStatus, { label: string; bg: string; text: string; icon: any }> = {
      submitted: { label: "Submitted", bg: "bg-neutral-500/10 border-neutral-500/20", text: "text-neutral-400", icon: Clock },
      under_review: { label: "Under Review", bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400", icon: Clock },
      in_progress: { label: "In Progress", bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400", icon: Loader2 },
      resolved: { label: "Resolved", bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", icon: CheckCircle2 },
      closed: { label: "Closed", bg: "bg-neutral-800 border-neutral-700", text: "text-neutral-400", icon: X },
    };
    const c = config[status] || config.submitted;
    const Icon = c.icon;
    return (
      <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border", c.bg, c.text)}>
        <Icon className="w-3 h-3" />
        {c.label}
      </span>
    );
  };

  // Type Badge Component
  const getTypeBadge = (type: FeedbackType) => {
    const config: Record<FeedbackType, { label: string; icon: any; color: string }> = {
      bug: { label: "Bug Report", icon: Bug, color: "text-red-400" },
      feature: { label: "Feature Request", icon: Lightbulb, color: "text-amber-400" },
      ui: { label: "UI / Design", icon: Palette, color: "text-purple-400" },
      performance: { label: "Performance", icon: Zap, color: "text-cyan-400" },
      other: { label: "Feedback", icon: HelpCircle, color: "text-neutral-400" },
    };
    const c = config[type] || config.other;
    const Icon = c.icon;
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", c.color)}>
        <Icon className="w-3.5 h-3.5" />
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Sub-tabs */}
      <div className="border-b border-border pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Help & Feedback Center</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Submit issues, suggest improvements, and track your active tickets.
            </p>
          </div>

          <div className="inline-flex p-1 bg-secondary/80 rounded-xl border border-border/50 self-start sm:self-auto">
            <button
              onClick={() => { setActiveSubTab("send"); setSelectedFeedback(null); }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                activeSubTab === "send" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Send Feedback
            </button>
            <button
              onClick={() => { setActiveSubTab("mine"); setSelectedFeedback(null); }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                activeSubTab === "mine" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              My Tickets ({myFeedback.length})
            </button>
            {isAdmin && (
              <button
                onClick={() => { setActiveSubTab("admin"); setSelectedFeedback(null); }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                  activeSubTab === "admin" ? "bg-primary text-primary-foreground shadow-sm" : "text-primary hover:bg-primary/10"
                )}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Moderation
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Sub-tab 1: Send Feedback ────────────────────────────────────────── */}
      {activeSubTab === "send" && (
        <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
          {/* Feedback Type Buttons */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">
              What kind of feedback do you have?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { type: "bug" as FeedbackType, label: "Bug Report", icon: Bug },
                { type: "feature" as FeedbackType, label: "Feature", icon: Lightbulb },
                { type: "ui" as FeedbackType, label: "UI / Design", icon: Palette },
                { type: "performance" as FeedbackType, label: "Performance", icon: Zap },
                { type: "other" as FeedbackType, label: "General", icon: HelpCircle },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = feedbackType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setFeedbackType(item.type)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all gap-1.5",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                        : "border-border bg-card/50 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">
              Summary / Title <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., Cannot play voice notes in direct messages"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-card border-border"
              maxLength={150}
              required
            />
          </div>

          {/* Bug Report Specific Fields */}
          {feedbackType === "bug" && (
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Info className="w-4 h-4" />
                <span>Bug Details (helps us reproduce and fix it faster)</span>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">What happened?</label>
                <Input
                  placeholder="e.g., Audio failed to start and an error toast appeared"
                  value={whatHappened}
                  onChange={(e) => setWhatHappened(e.target.value)}
                  className="bg-background text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">What did you expect?</label>
                <Input
                  placeholder="e.g., The voice message should play with waveform animation"
                  value={whatExpected}
                  onChange={(e) => setWhatExpected(e.target.value)}
                  className="bg-background text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Steps to reproduce:</label>
                <Textarea
                  placeholder="1. Open direct messages&#10;2. Select a conversation&#10;3. Tap the play button on audio"
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  className="bg-background text-xs min-h-[70px]"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                <span>Detected Platform:</span>
                <span className="font-mono text-foreground/80">{getBrowserInfo()}</span>
              </div>
            </div>
          )}

          {/* Detailed Description */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">
              Detailed Description <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Describe what you experienced or how you envision this feature working..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-card border-border min-h-[110px]"
              required
            />
          </div>

          {/* Screenshot Upload */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">
              Screenshot or Attachment (Optional)
            </label>

            {screenshotData ? (
              <div className="relative rounded-xl overflow-hidden border border-border bg-card p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={screenshotData}
                    alt="Preview"
                    className="w-14 h-14 rounded-lg object-cover border border-border"
                  />
                  <div>
                    <p className="text-xs font-medium text-foreground truncate max-w-[200px]">
                      {screenshotName || "screenshot.png"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {uploadingImage ? "Uploading to Cloud..." : "Ready to attach"}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={removeScreenshot}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer hover:border-primary/60 hover:bg-secondary/30 transition-all flex flex-col items-center justify-center gap-1.5"
              >
                <Upload className="w-6 h-6 text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">Click to upload screenshot</p>
                <p className="text-[11px] text-muted-foreground">Supports PNG, JPG, WebP up to 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotSelect}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Rate Experience */}
          <div className="pt-2 border-t border-border/60">
            <label className="text-sm font-semibold text-foreground mb-2 block">
              How would you rate your overall experience with WhiterChat?
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setRatingHover(star)}
                  onMouseLeave={() => setRatingHover(null)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "w-6 h-6 transition-colors",
                      (ratingHover !== null ? star <= ratingHover : star <= rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/40"
                    )}
                  />
                </button>
              ))}
              <span className="text-xs font-medium text-muted-foreground ml-2">
                {rating === 5 ? "Excellent 🌟" : rating === 4 ? "Very Good 😊" : rating === 3 ? "Good 👍" : rating === 2 ? "Fair 😐" : "Needs Work 👎"}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting || uploadingImage}
            className="w-full sm:w-auto px-8 py-2.5 font-bold"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting Ticket...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </form>
      )}

      {/* ── Sub-tab 2: My Tickets ─────────────────────────────────────────── */}
      {activeSubTab === "mine" && (
        <div className="space-y-4">
          {selectedFeedback ? (
            /* Detailed View for Single Feedback */
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6 animate-in fade-in">
              <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {getTypeBadge(selectedFeedback.type)}
                    {getStatusBadge(selectedFeedback.status)}
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{selectedFeedback.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submitted on {new Date(selectedFeedback.createdAt).toLocaleDateString()} at{" "}
                    {new Date(selectedFeedback.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFeedback(null)}
                >
                  Back to List
                </Button>
              </div>

              {/* Description & Bug Details */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Description
                  </h4>
                  <p className="text-sm text-foreground whitespace-pre-wrap bg-secondary/30 p-3.5 rounded-xl border border-border/50">
                    {selectedFeedback.description}
                  </p>
                </div>

                {selectedFeedback.bugDetails && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-secondary/20 rounded-xl border border-border/40 text-xs">
                    {selectedFeedback.bugDetails.whatHappened && (
                      <div>
                        <span className="font-semibold text-muted-foreground block">What happened:</span>
                        <span className="text-foreground">{selectedFeedback.bugDetails.whatHappened}</span>
                      </div>
                    )}
                    {selectedFeedback.bugDetails.whatExpected && (
                      <div>
                        <span className="font-semibold text-muted-foreground block">Expected outcome:</span>
                        <span className="text-foreground">{selectedFeedback.bugDetails.whatExpected}</span>
                      </div>
                    )}
                    {selectedFeedback.bugDetails.stepsToReproduce && (
                      <div className="sm:col-span-2">
                        <span className="font-semibold text-muted-foreground block">Reproduction Steps:</span>
                        <span className="text-foreground whitespace-pre-wrap">{selectedFeedback.bugDetails.stepsToReproduce}</span>
                      </div>
                    )}
                    {selectedFeedback.bugDetails.browserInfo && (
                      <div className="sm:col-span-2 text-[11px] text-muted-foreground pt-2 border-t border-border/30">
                        <span>Client environment: </span>
                        <span className="font-mono">{selectedFeedback.bugDetails.browserInfo}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Attachments */}
                {selectedFeedback.attachments && selectedFeedback.attachments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Attachments
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {selectedFeedback.attachments.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="relative group block rounded-xl overflow-hidden border border-border"
                        >
                          <img
                            src={url}
                            alt="Attachment"
                            className="w-32 h-32 object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ExternalLink className="w-5 h-5 text-white" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Official Responses Timeline */}
              <div className="border-t border-border pt-5 space-y-4">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Official Responses & Updates ({(selectedFeedback.adminReplies || []).length})
                </h4>

                {selectedFeedback.adminReplies && selectedFeedback.adminReplies.length > 0 ? (
                  <div className="space-y-3">
                    {selectedFeedback.adminReplies.map((reply, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-4 rounded-xl border text-sm space-y-1.5",
                          reply.isInternal
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100"
                            : "bg-primary/5 border-primary/20 text-foreground"
                        )}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold flex items-center gap-1.5 text-primary">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {reply.adminUsername} (Support Team)
                            {reply.isInternal && <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded font-mono">Internal Note</span>}
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            {new Date(reply.createdAt).toLocaleDateString()} at {new Date(reply.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm whitespace-pre-wrap">{reply.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic bg-secondary/30 p-4 rounded-xl">
                    No official replies yet. Our engineering team reviews incoming reports regularly.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Tickets List */
            <div>
              {loadingMine ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  <p className="text-xs text-muted-foreground mt-2">Loading your feedback history...</p>
                </div>
              ) : myFeedback.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-border rounded-2xl">
                  <HelpCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <h4 className="text-base font-semibold text-foreground">No Feedback Submitted Yet</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-4">
                    Have an idea or found a bug? Send us feedback and track our responses here.
                  </p>
                  <Button size="sm" onClick={() => setActiveSubTab("send")}>
                    Submit New Feedback
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myFeedback.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => openFeedbackDetail(item)}
                      className="p-4 rounded-xl border border-border bg-card hover:bg-secondary/40 cursor-pointer transition-all flex items-center justify-between gap-4 group"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getTypeBadge(item.type)}
                          {getStatusBadge(item.status)}
                        </div>
                        <h4 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                          {item.repliesCount ? (
                            <span className="text-primary font-medium flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {item.repliesCount} reply
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Sub-tab 3: Admin Moderation ───────────────────────────────────── */}
      {activeSubTab === "admin" && isAdmin && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-card p-3 rounded-xl border border-border">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchAdminFeedback()}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Types</option>
                <option value="bug">Bugs</option>
                <option value="feature">Features</option>
                <option value="ui">UI</option>
                <option value="performance">Performance</option>
                <option value="other">Other</option>
              </select>

              <Button size="sm" variant="secondary" onClick={fetchAdminFeedback} className="h-9 text-xs">
                Filter
              </Button>
            </div>
          </div>

          {/* Admin Ticket List */}
          {loadingAdmin ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground mt-2">Loading tickets...</p>
            </div>
          ) : adminFeedback.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-2xl">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Inbox Zero</p>
              <p className="text-xs text-muted-foreground mt-1">No feedback tickets match the selected filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {adminFeedback.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-border bg-card space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2">
                      {getTypeBadge(item.type)}
                      {getStatusBadge(item.status)}
                      <span className="text-xs text-muted-foreground">
                        by <span className="font-semibold text-foreground">@{item.user?.username || "unknown"}</span>
                      </span>
                    </div>

                    {/* Status Changer */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      <select
                        value={item.status}
                        disabled={updatingStatus}
                        onChange={(e) => handleAdminStatusChange(item.id, e.target.value as FeedbackStatus)}
                        className="h-8 px-2.5 rounded-lg border border-border bg-secondary text-xs text-foreground font-medium focus:outline-none"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under Review</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{item.description}</p>
                  </div>

                  {item.bugDetails && (
                    <div className="p-3 bg-secondary/30 rounded-lg text-xs space-y-1 text-muted-foreground">
                      {item.bugDetails.whatHappened && <div><span className="font-semibold text-foreground">Happened:</span> {item.bugDetails.whatHappened}</div>}
                      {item.bugDetails.stepsToReproduce && <div><span className="font-semibold text-foreground">Steps:</span> {item.bugDetails.stepsToReproduce}</div>}
                      {item.bugDetails.browserInfo && <div className="font-mono text-[11px] text-foreground/70">Client: {item.bugDetails.browserInfo}</div>}
                    </div>
                  )}

                  {item.attachments && item.attachments.length > 0 && (
                    <div className="flex gap-2">
                      {item.attachments.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt="Attachment" className="w-16 h-16 object-cover rounded-lg border border-border" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Reply Form */}
                  <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row gap-2 items-end sm:items-center">
                    <Input
                      placeholder="Add an official reply or note..."
                      value={selectedFeedback?.id === item.id ? adminReplyText : ""}
                      onFocus={() => setSelectedFeedback(item)}
                      onChange={(e) => setAdminReplyText(e.target.value)}
                      className="text-xs h-8 flex-1"
                    />
                    <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedFeedback?.id === item.id ? adminReplyInternal : false}
                        onChange={(e) => setAdminReplyInternal(e.target.checked)}
                        className="rounded"
                      />
                      Internal
                    </label>
                    <Button
                      size="sm"
                      disabled={submittingReply || !adminReplyText.trim() || selectedFeedback?.id !== item.id}
                      onClick={() => handleAdminReply(item.id)}
                      className="h-8 text-xs font-semibold px-4"
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
