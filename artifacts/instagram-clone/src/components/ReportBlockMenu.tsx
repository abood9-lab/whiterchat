import { useState } from "react";
import { useLocation } from "wouter";
import { MoreHorizontal, Flag, Ban, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button as RadioButton } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useBlockUser,
  useUnblockUser,
  useReportUser,
  getGetUserProfileQueryKey,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const REPORT_REASONS = [
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "fake_account", label: "Fake account" },
  { id: "inappropriate_content", label: "Inappropriate content" },
  { id: "impersonation", label: "Impersonation" },
  { id: "other", label: "Something else" },
];

export function ReportBlockMenu({
  username,
  isBlocked,
}: {
  username: string;
  isBlocked: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [unblockConfirmOpen, setUnblockConfirmOpen] = useState(false);

  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();
  const reportMutation = useReportUser();

  const invalidateProfile = () => {
    queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey(username) });
  };

  const handleBlock = async () => {
    try {
      await blockMutation.mutateAsync({ username });
      invalidateProfile();
      toast({ title: `You've blocked @${username}`, description: "They can no longer find your profile, follow you, or message you." });
      setBlockConfirmOpen(false);
      setLocation(`/profile/${username}`);
    } catch {
      toast({ title: "Failed to block", variant: "destructive" });
    }
  };

  const handleUnblock = async () => {
    try {
      await unblockMutation.mutateAsync({ username });
      invalidateProfile();
      toast({ title: `Unblocked @${username}` });
      setUnblockConfirmOpen(false);
    } catch {
      toast({ title: "Failed to unblock", variant: "destructive" });
    }
  };

  const handleSubmitReport = async () => {
    if (!reason) return;
    try {
      await reportMutation.mutateAsync({ username, data: { reason, details: details || undefined } });
      toast({ title: "Report submitted", description: "Thanks for letting us know. Our team will review it." });
      setReportOpen(false);
      setReason(null);
      setDetails("");
    } catch {
      toast({ title: "Failed to submit report", variant: "destructive" });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setReportOpen(true)} className="gap-2 text-sm cursor-pointer">
            <Flag className="w-4 h-4" />
            Report
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isBlocked ? (
            <DropdownMenuItem onClick={() => setUnblockConfirmOpen(true)} className="gap-2 text-sm cursor-pointer">
              <ShieldCheck className="w-4 h-4" />
              Unblock
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setBlockConfirmOpen(true)} className="gap-2 text-sm text-destructive focus:text-destructive cursor-pointer">
              <Ban className="w-4 h-4" />
              Block
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Report modal */}
      <Dialog open={reportOpen} onOpenChange={(o) => { setReportOpen(o); if (!o) { setReason(null); setDetails(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Report @{username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Why are you reporting this account?</p>
            <div className="space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReason(r.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl border-2 text-sm transition-all",
                    reason === r.id
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border hover:border-muted-foreground/40"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {reason === "other" && (
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Tell us more (optional)"
                className="resize-none mt-2"
                rows={3}
              />
            )}
          </div>
          <DialogFooter>
            <RadioButton variant="secondary" onClick={() => setReportOpen(false)}>Cancel</RadioButton>
            <RadioButton
              variant="destructive"
              disabled={!reason || reportMutation.isPending}
              onClick={handleSubmitReport}
            >
              {reportMutation.isPending ? "Submitting..." : "Submit report"}
            </RadioButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block confirm */}
      <AlertDialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block @{username}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to find your profile, posts, or story, message you, or see that you've blocked them.
              You can unblock them at any time from Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unblock confirm */}
      <AlertDialog open={unblockConfirmOpen} onOpenChange={setUnblockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock @{username}?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll be able to see your profile and content again, and will be able to follow and message you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblock}>Unblock</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
