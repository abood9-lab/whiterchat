import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { AlertTriangle, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reelId: string;
}

const REPORT_REASONS = [
  { id: "spam", label: "Spam or misleading" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "inappropriate_content", label: "Inappropriate or adult content" },
  { id: "violence", label: "Violence or dangerous organizations" },
  { id: "scam", label: "Scam or fraud" },
  { id: "intellectual_property", label: "Intellectual property violation" },
  { id: "other", label: "Other" },
];

export function ReportReelModal({ open, onOpenChange, reelId }: Props) {
  const [reason, setReason] = useState("inappropriate_content");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("whiterchat_token");
      const res = await fetch(apiUrl(`/api/reels/${reelId}/report`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason, details }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit report");
      }

      toast({
        title: "Report submitted",
        description: "Thank you for helping keep our community safe. We will review this Reel promptly.",
      });
      onOpenChange(false);
      setDetails("");
    } catch {
      toast({
        title: "Error submitting report",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <DialogTitle className="text-center text-lg">Report Reel</DialogTitle>
          <DialogDescription className="text-center text-xs">
            Why are you reporting this Reel? Your report is anonymous.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
            {REPORT_REASONS.map((r) => (
              <div
                key={r.id}
                className="flex items-center space-x-2 rounded-lg border border-border p-2.5 hover:bg-muted/50 cursor-pointer"
                onClick={() => setReason(r.id)}
              >
                <RadioGroupItem value={r.id} id={r.id} />
                <Label htmlFor={r.id} className="text-xs font-medium cursor-pointer flex-1">
                  {r.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-1.5">
            <Label htmlFor="details" className="text-xs">
              Additional details (optional)
            </Label>
            <Textarea
              id="details"
              placeholder="Provide more context..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="h-20 text-xs resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={submitting}
              className="gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Submit Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
