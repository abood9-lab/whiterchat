import { useState } from "react";
import { useAuth, StoredAccount } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import {
  Users,
  UserPlus,
  CheckCircle2,
  LogOut,
  ArrowRightLeft,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Plus,
  Key,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

export function MultiAccountSection() {
  const { user, accounts, switchAccount, addAccount, logoutAccount } = useAuth();
  const { toast } = useToast();

  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [accountToRemove, setAccountToRemove] = useState<StoredAccount | null>(null);

  // Add Account form state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSwitch = async (acc: StoredAccount) => {
    if (acc.id === user?.id) return;
    setSwitchingId(acc.id);
    try {
      const success = await switchAccount(acc.id);
      if (success) {
        toast({
          title: "Account Switched",
          description: `Now logged in as @${acc.username}`,
        });
      } else {
        toast({
          title: "Session Expired",
          description: `The session for @${acc.username} expired. Please log in again.`,
          variant: "destructive",
        });
        logoutAccount(acc.id);
      }
    } catch {
      toast({
        title: "Error switching account",
        variant: "destructive",
      });
    } finally {
      setSwitchingId(null);
    }
  };

  const handleAddAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!identifier.trim() || !password) {
      setErrorMessage("Please enter both username/email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to log in to this account.");
        return;
      }

      // Check if already in current active account
      if (user?.id === data.user.id) {
        setErrorMessage("You are already logged into this account.");
        return;
      }

      addAccount(data.token, data.refreshToken, data.user);
      toast({
        title: "Account Added Successfully",
        description: `Connected and switched to @${data.user.username}`,
      });
      setIdentifier("");
      setPassword("");
      setAddAccountOpen(false);
    } catch {
      setErrorMessage("An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRemove = () => {
    if (!accountToRemove) return;
    logoutAccount(accountToRemove.id);
    toast({
      title: "Account Removed",
      description: `@${accountToRemove.username} has been logged out from this browser.`,
    });
    setAccountToRemove(null);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">Account Switching & Management</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Add and manage multiple WhiterChat accounts on this device. Switch seamlessly between personal, business, or creator profiles with a single tap.
        </p>
      </div>

      {/* Connected Accounts List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Logged-In Accounts ({accounts.length})
          </span>
          <Button
            size="sm"
            onClick={() => setAddAccountOpen(true)}
            className="h-8 px-3 text-xs gap-1.5 font-semibold rounded-xl bg-primary text-primary-foreground"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden shadow-xs">
          {accounts.map((acc) => {
            const isActive = acc.id === user?.id;
            const isSwitching = switchingId === acc.id;

            return (
              <div
                key={acc.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative">
                    <Avatar className="w-11 h-11 ring-2 ring-border">
                      <AvatarImage src={acc.avatarUrl || undefined} />
                      <AvatarFallback className="text-sm font-bold bg-gradient-to-tr from-purple-500 to-pink-500 text-white">
                        {acc.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isActive && (
                      <span
                        className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-background text-emerald-500"
                        title="Active Account"
                      >
                        <CheckCircle2 className="w-4 h-4 fill-emerald-500 text-background" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">
                        @{acc.username}
                      </span>
                      {isActive && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {acc.fullName || "WhiterChat User"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSwitching}
                      onClick={() => handleSwitch(acc)}
                      className="h-8 px-3 text-xs gap-1.5 font-semibold rounded-xl"
                    >
                      {isSwitching ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
                      )}
                      <span>Switch</span>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground font-medium px-2">
                      In use
                    </span>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAccountToRemove(acc)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                    title={`Log out @${acc.username}`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-2xl bg-muted/50 border border-border flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground mb-0.5">Quick Switch & Privacy</p>
          Switching accounts switches your active feeds, notifications, and private messages immediately without asking for credentials again. You can log out individual accounts anytime.
        </div>
      </div>

      {/* Add Account Modal */}
      <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="w-5 h-5 text-primary" />
              Add Existing WhiterChat Account
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter the username or email and password of the account you want to connect.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddAccountSubmit} className="space-y-4 py-2">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="acc-identifier" className="text-xs font-semibold">
                Username or Email
              </Label>
              <Input
                id="acc-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. johndoe or user@example.com"
                className="h-10 text-xs rounded-xl"
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acc-pwd" className="text-xs font-semibold">
                Password
              </Label>
              <Input
                id="acc-pwd"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="h-10 text-xs rounded-xl"
                autoComplete="current-password"
                required
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddAccountOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add & Sign In
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove / Log Out Account Confirmation */}
      <AlertDialog
        open={!!accountToRemove}
        onOpenChange={(open) => !open && setAccountToRemove(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Log out @{accountToRemove?.username}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This account will be removed from your saved accounts on this device. You can log back in at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Log Out Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
