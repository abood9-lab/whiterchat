import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import {
  TrendingUp,
  Users,
  Eye,
  Heart,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart3,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function CreatorDashboardSection() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [analytics, setAnalytics] = useState({
    impressions: 14250,
    reach: 8920,
    engagementRate: 4.8,
    profileVisits: 630,
    growthPercent: "+12.4%",
  });

  // Verification request modal
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [category, setCategory] = useState("Creator / Influencer");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPendingReview, setIsPendingReview] = useState(false);

  const isVerified = (user as any)?.isVerified;

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName || !reason) {
      toast({ title: "Please fill out all required fields", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/users/me/request-verification"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ legalName, category, reason }),
      });

      if (res.ok) {
        setIsPendingReview(true);
        setVerifyModalOpen(false);
        toast({ title: "Verification request submitted for review!" });
      } else {
        toast({ title: "Submission failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "An error occurred", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Creator Tools & Insights</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Professional analytics, audience reach overview, and account verification badge request.
        </p>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-primary" /> Impressions
          </div>
          <div className="text-xl font-bold">{analytics.impressions.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{analytics.growthPercent}</div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-500" /> Accounts Reached
          </div>
          <div className="text-xl font-bold">{analytics.reach.toLocaleString()}</div>
          <div className="text-[11px] text-muted-foreground">Last 30 days</div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-purple-500" /> Engagement
          </div>
          <div className="text-xl font-bold">{analytics.engagementRate}%</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">+0.6% vs last week</div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-rose-500" /> Profile Visits
          </div>
          <div className="text-xl font-bold">{analytics.profileVisits.toLocaleString()}</div>
          <div className="text-[11px] text-muted-foreground">Unique visitors</div>
        </div>
      </div>

      {/* Verification Badge Section */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base">Verified Badge</h3>
                {isVerified && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600">
                    Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isVerified
                  ? "Your account is verified. A blue badge appears beside your name across WhiterChat."
                  : isPendingReview
                  ? "Your verification request is currently under review by the moderation team."
                  : "Request a verified blue badge to authenticate your public persona or brand."}
              </p>
            </div>
          </div>

          {!isVerified && !isPendingReview && (
            <Button
              onClick={() => setVerifyModalOpen(true)}
              size="sm"
              className="text-xs font-semibold shrink-0 bg-primary text-primary-foreground"
            >
              Apply for Badge
            </Button>
          )}

          {isPendingReview && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5" /> In Review
            </div>
          )}
        </div>
      </div>

      {/* Verification Request Modal */}
      <Dialog open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-500" /> Apply for Verification
            </DialogTitle>
            <DialogDescription>
              Submit your official details to request a verified badge on your profile.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitVerification} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="v-legal-name">Full Legal Name</Label>
              <Input
                id="v-legal-name"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Official name matching government ID"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="v-category">Category</Label>
              <select
                id="v-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Creator / Influencer">Creator / Influencer</option>
                <option value="News / Media">News / Media</option>
                <option value="Business / Brand">Business / Brand</option>
                <option value="Sports / Athlete">Sports / Athlete</option>
                <option value="Government / Politics">Government / Politics</option>
                <option value="Art / Entertainment">Art / Entertainment</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="v-reason">Notability & Links</Label>
              <Textarea
                id="v-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why your account represents a prominent public figure or brand. Include press articles or portfolio links."
                rows={3}
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setVerifyModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit Application
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
