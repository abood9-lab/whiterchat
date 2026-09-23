import { useState } from "react";
import { X, Flag, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api-url";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  messagePreview?: string | null;
  senderUsername?: string;
}

const REPORT_REASONS = [
  { id: "Spam", label: "Spam", desc: "Unwanted ads, suspicious links, or repetitive messages" },
  { id: "Harassment", label: "Harassment & Bullying", desc: "Personal attacks, targeting, or threats" },
  { id: "Abuse", label: "Hate Speech & Abuse", desc: "Slurs, hateful conduct, or hostile behavior" },
  { id: "Inappropriate Content", label: "Inappropriate Content", desc: "Explicit images, nudity, or graphic material" },
  { id: "Scam", label: "Scam & Fraud", desc: "Impersonation, phishing, or financial scams" },
  { id: "Other", label: "Other issue", desc: "Any other violation not listed above" },
];

export function ReportModal({ isOpen, onClose, messageId, messagePreview, senderUsername }: Props) {
  const [selectedReason, setSelectedReason] = useState<string>("Spam");
  const [details, setDetails] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) return;
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl(`/api/messages/${messageId}/report`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: selectedReason,
          details: details.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit report");
      }

      setStatusMessage({
        type: "success",
        text: data.message || "Report submitted successfully. Our team will review it.",
      });

      setTimeout(() => {
        onClose();
        setShowConfirmation(false);
        setStatusMessage(null);
        setDetails("");
      }, 1600);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "An error occurred while submitting the report",
      });
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-none sm:max-w-md bg-card border-t sm:border border-border rounded-t-[28px] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[90vh] pb-[max(1rem,calc(1rem+env(safe-area-inset-bottom)))] sm:pb-0"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="mx-auto mt-2.5 -mb-1 h-1.5 w-12 rounded-full bg-muted-foreground/30 sm:hidden shrink-0 pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Report Message</h3>
              <p className="text-xs text-muted-foreground">
                {senderUsername ? `Message from @${senderUsername}` : "Help us keep the community safe"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {showConfirmation ? (
          <div className="p-5 space-y-4">
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-2">
              <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>Confirm Message Report</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to report this message for <strong className="text-foreground">{selectedReason}</strong>? This report will be sent to community moderators for review.
              </p>
              {messagePreview && (
                <div className="p-2.5 rounded-lg bg-background/80 border border-border text-[11px] text-muted-foreground italic line-clamp-2 mt-2">
                  "{messagePreview}"
                </div>
              )}
            </div>

            {statusMessage && (
              <div
                className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
                  statusMessage.type === "success"
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirmation(false)}
                disabled={isSubmitting}
                className="rounded-xl text-xs"
              >
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="rounded-xl text-xs gap-1.5 font-bold px-5"
              >
                {isSubmitting ? (
                  <>Submitting...</>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Confirm & Send Report
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInitialSubmit} className="p-5 space-y-4 overflow-y-auto">
            {/* Message preview */}
            {messagePreview && (
              <div className="p-3 rounded-xl bg-secondary/60 border border-border/60 text-xs text-muted-foreground line-clamp-2">
                <span className="font-semibold text-foreground mr-1">Message preview:</span>
                "{messagePreview}"
              </div>
            )}

            {statusMessage && (
              <div
                className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
                  statusMessage.type === "success"
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-foreground block mb-2">
                Reason for reporting <span className="text-destructive">*</span>
              </label>
              <div className="space-y-1.5">
                {REPORT_REASONS.map(reason => (
                  <label
                    key={reason.id}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      selectedReason === reason.id
                        ? "border-primary bg-primary/5 text-foreground shadow-xs"
                        : "border-border/60 hover:bg-secondary/40 text-muted-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      name="report_reason"
                      value={reason.id}
                      checked={selectedReason === reason.id}
                      onChange={() => setSelectedReason(reason.id)}
                      className="mt-1 text-primary focus:ring-primary h-4 w-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground">{reason.label}</div>
                      <div className="text-[11px] text-muted-foreground">{reason.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Additional details (optional)
              </label>
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Describe the issue with more details to help our review team..."
                className="w-full text-xs p-3 rounded-xl bg-secondary/40 border border-border focus:outline-none focus:border-primary/50 resize-none h-20"
                maxLength={500}
              />
              <div className="text-[10px] text-muted-foreground text-right mt-0.5">
                {details.length}/500
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={isSubmitting || !selectedReason}
                className="rounded-xl text-xs gap-1.5 font-medium px-4"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Next: Confirm Report
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
