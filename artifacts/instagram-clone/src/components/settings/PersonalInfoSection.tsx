import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-url";
import { Mail, Phone, Calendar, ShieldCheck, CheckCircle2, Loader2, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function PersonalInfoSection() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Email modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Phone modal
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phonePassword, setPhonePassword] = useState("");
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Recently joined";

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !emailPassword) {
      toast({ title: "Email and password are required", variant: "destructive" });
      return;
    }
    setIsUpdatingEmail(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/users/me/change-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newEmail: newEmail.trim(), password: emailPassword }),
      });

      if (res.ok) {
        const data = await res.json();
        if (user) updateUser({ ...user, email: data.email } as any);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({ title: "Email updated successfully!" });
        setEmailModalOpen(false);
        setNewEmail("");
        setEmailPassword("");
      } else {
        const err = await res.json();
        toast({ title: "Failed to update email", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "An error occurred", variant: "destructive" });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phonePassword) {
      toast({ title: "Password is required", variant: "destructive" });
      return;
    }
    setIsUpdatingPhone(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/users/me/change-phone"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phoneNumber: newPhone.trim(), password: phonePassword }),
      });

      if (res.ok) {
        const data = await res.json();
        if (user) updateUser({ ...user, phoneNumber: data.phoneNumber } as any);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({ title: "Phone number updated successfully!" });
        setPhoneModalOpen(false);
        setNewPhone("");
        setPhonePassword("");
      } else {
        const err = await res.json();
        toast({ title: "Failed to update phone", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "An error occurred", variant: "destructive" });
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Personal Information & Ownership</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your sensitive contact details and account ownership status.
        </p>
      </div>

      <div className="space-y-4">
        {/* Email Card */}
        <div className="p-4 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</div>
              <div className="font-semibold text-sm mt-0.5">{(user as any)?.email || "No email provided"}</div>
              <div className="text-xs text-muted-foreground mt-1">Used for security alerts and account recovery</div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewEmail((user as any)?.email || "");
              setEmailModalOpen(true);
            }}
            className="text-xs font-semibold shrink-0"
          >
            Change Email
          </Button>
        </div>

        {/* Phone Number Card */}
        <div className="p-4 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</div>
              <div className="font-semibold text-sm mt-0.5">{(user as any)?.phoneNumber || "No phone added"}</div>
              <div className="text-xs text-muted-foreground mt-1">For SMS authentication and recovery</div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewPhone((user as any)?.phoneNumber || "");
              setPhoneModalOpen(true);
            }}
            className="text-xs font-semibold shrink-0"
          >
            {(user as any)?.phoneNumber ? "Change Phone" : "Add Phone"}
          </Button>
        </div>

        {/* Account Meta & Creation Date */}
        <div className="p-4 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Member Since</div>
              <div className="font-semibold text-sm mt-0.5">{formattedDate}</div>
              <div className="text-xs text-muted-foreground mt-1">Official account registration date</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full self-start sm:self-auto">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active Account</span>
          </div>
        </div>

        {/* Verification Status */}
        <div className="p-4 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verification Badge</div>
              <div className="font-semibold text-sm mt-0.5">
                {(user as any)?.isVerified ? "Verified Account" : "Standard Account"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {(user as any)?.isVerified
                  ? "Your account has been officially verified by WhiterChat."
                  : "Apply for a verified badge in Creator Dashboard."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Email Dialog */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" /> Change Email Address
            </DialogTitle>
            <DialogDescription>
              Enter your new email address and current password to verify ownership.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateEmail} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="modal-new-email">New Email</Label>
              <Input
                id="modal-new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new.email@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-email-pwd">Current Password</Label>
              <Input
                id="modal-email-pwd"
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder="Enter current password"
                required
              />
            </div>
            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setEmailModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingEmail}>
                {isUpdatingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Update Email
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Phone Dialog */}
      <Dialog open={phoneModalOpen} onOpenChange={setPhoneModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-emerald-500" /> Update Phone Number
            </DialogTitle>
            <DialogDescription>
              Enter your phone number with country code and confirm with your password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePhone} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="modal-new-phone">Phone Number</Label>
              <Input
                id="modal-new-phone"
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+1 555 123 4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-phone-pwd">Current Password</Label>
              <Input
                id="modal-phone-pwd"
                type="password"
                value={phonePassword}
                onChange={(e) => setPhonePassword(e.target.value)}
                placeholder="Enter current password"
                required
              />
            </div>
            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setPhoneModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingPhone}>
                {isUpdatingPhone ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Update Phone
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
