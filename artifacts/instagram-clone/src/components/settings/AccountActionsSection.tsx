import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { LogOut, AlertTriangle, ShieldX, PauseCircle, Loader2, Users, UserPlus } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function AccountActionsSection({ onNavigateToMultiAccount }: { onNavigateToMultiAccount?: () => void }) {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword) {
      toast({ title: "Password is required to delete account", variant: "destructive" });
      return;
    }
    if (deleteConfirmText !== "DELETE") {
      toast({ title: "Please type DELETE to confirm", variant: "destructive" });
      return;
    }
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/users/me/delete-account"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: deletePassword, confirmationText: deleteConfirmText }),
      });

      if (res.ok) {
        toast({ title: "Account permanently deleted" });
        logout();
        setLocation("/login");
      } else {
        const err = await res.json();
        toast({ title: "Deletion failed", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "An error occurred", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deactivatePassword) {
      toast({ title: "Password is required to deactivate", variant: "destructive" });
      return;
    }
    setIsDeactivating(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/users/me/deactivate"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: deactivatePassword }),
      });

      if (res.ok) {
        toast({ title: "Account deactivated", description: "You can log back in at any time to restore your profile." });
        logout();
        setLocation("/login");
      } else {
        const err = await res.json();
        toast({ title: "Deactivation failed", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to deactivate account", variant: "destructive" });
    } finally {
      setIsDeactivating(false);
    }
  };


  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Account Actions & Danger Zone</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Session sign-out, temporary account deactivation, or permanent deletion.
        </p>
      </div>

      {/* Multi-Account Switching Card */}
      <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Add or Switch Accounts</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect multiple WhiterChat accounts to this device and switch between them instantly without signing out.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (onNavigateToMultiAccount) {
              onNavigateToMultiAccount();
            } else {
              setLocation("/settings?tab=multi-account");
            }
          }}
          className="w-full sm:w-auto text-xs font-semibold shrink-0 gap-1.5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Manage Accounts</span>
        </Button>
      </div>

      {/* Log Out */}
      <div className="p-6 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-muted text-foreground shrink-0">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Sign Out</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sign out of your account on this browser.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLogoutDialogOpen(true)}
          className="w-full sm:w-auto text-xs font-semibold shrink-0"
        >
          Sign Out
        </Button>
      </div>

      {/* Temporary Deactivation */}
      <div className="p-6 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
            <PauseCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Temporarily Deactivate Account</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hide your profile, posts, and comments until you log back in again.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDeactivateDialogOpen(true)}
          className="w-full sm:w-auto text-xs font-semibold shrink-0 text-amber-600 hover:text-amber-700"
        >
          Deactivate
        </Button>
      </div>

      {/* Permanent Deletion */}
      <div className="p-6 rounded-2xl border border-destructive/30 bg-destructive/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive shrink-0">
            <ShieldX className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-destructive">Delete Account</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently remove your account, profile, all media, comments, and follower data. This action is irreversible.
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
          className="w-full sm:w-auto text-xs font-semibold shrink-0"
        >
          Delete Account
        </Button>
      </div>

      {/* Logout Confirmation */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to enter your username and password to log back in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Confirmation */}
      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <PauseCircle className="w-5 h-5" /> Deactivate Account
            </DialogTitle>
            <DialogDescription>
              Your profile, posts, and comments will be hidden until you reactivate by logging in. Enter your password to confirm.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeactivate} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="deact-pwd">Account Password</Label>
              <Input
                id="deact-pwd"
                type="password"
                value={deactivatePassword}
                onChange={(e) => setDeactivatePassword(e.target.value)}
                placeholder="Enter your account password"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDeactivateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={isDeactivating || !deactivatePassword}
              >
                {isDeactivating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm Deactivation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Permanently Delete Account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. All your media, followers, messages, and settings will be wiped forever.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeleteAccount} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="del-pwd">Confirm Password</Label>
              <Input
                id="del-pwd"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your account password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="del-confirm" className="text-xs text-muted-foreground">
                Type <strong className="text-destructive font-mono">DELETE</strong> to confirm permanent erasure:
              </Label>
              <Input
                id="del-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="font-mono text-sm"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isDeleting || !deletePassword || deleteConfirmText !== "DELETE"}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Permanently Delete
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
