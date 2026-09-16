import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import {
  Lock,
  Smartphone,
  Laptop,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Check,
  Copy,
  QrCode,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SessionItem {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: string;
  current?: boolean;
}

interface SecurityAlertItem {
  id: string;
  deviceName: string;
  location: string;
  timestamp: string;
  ip: string;
}

export function SecuritySection() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Security alerts state
  const [alerts, setAlerts] = useState<SecurityAlertItem[]>([]);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    (user as any)?.twoFactorEnabled || false
  );
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [twoFactorOtpUrl, setTwoFactorOtpUrl] = useState("");
  const [twoFactorQrCode, setTwoFactorQrCode] = useState("");
  const [twoFactorBackupCodes, setTwoFactorBackupCodes] = useState<string[]>([]);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [disable2FAModalOpen, setDisable2FAModalOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/users/me/sessions"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch {
      // ignore
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/users/me/security-alerts"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchAlerts();
  }, []);

  // Password strength calculation & rules
  const hasMinLength = newPassword.length >= 10;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isNewPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: "", color: "bg-muted" };
    let score = 0;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, text: "Weak", color: "bg-red-500" };
    if (score === 2) return { score: 2, text: "Fair", color: "bg-amber-500" };
    if (score === 3) return { score: 3, text: "Good", color: "bg-blue-500" };
    return { score: 4, text: "Strong", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(newPassword);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNewPasswordValid) {
      toast({
        title: "Password does not meet requirements",
        description: "Password must be at least 10 characters and include uppercase, lowercase, number, and special character.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "New passwords do not match", variant: "destructive" });
      return;
    }

    setIsChangingPassword(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/auth/change-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        toast({ title: "Password updated successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const err = await res.json();
        toast({ title: "Failed to update password", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "An error occurred", variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      await fetch(apiUrl(`/api/users/me/sessions/${sessionId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(sessions.filter((s) => s.id !== sessionId));
      toast({ title: "Session terminated" });
    } catch {
      toast({ title: "Failed to terminate session", variant: "destructive" });
    }
  };

  const handleLogoutAllOther = async () => {
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      await fetch(apiUrl("/api/users/me/sessions"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchSessions();
      toast({ title: "Logged out from all other devices" });
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  const handleStart2FASetup = async () => {
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/users/me/2fa/setup"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTwoFactorSecret(data.secret);
        setTwoFactorOtpUrl(data.otpAuthUrl);
        setTwoFactorQrCode(data.qrCode || "");
        setTwoFactorBackupCodes(data.backupCodes);
        setTwoFactorModalOpen(true);
      }
    } catch {
      toast({ title: "Could not initiate 2FA setup", variant: "destructive" });
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying2FA(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/users/me/2fa/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          secret: twoFactorSecret,
          code: twoFactorCode.trim(),
          backupCodes: twoFactorBackupCodes,
        }),
      });

      if (res.ok) {
        setTwoFactorEnabled(true);
        setTwoFactorModalOpen(false);
        setTwoFactorCode("");
        toast({ title: "Two-Factor Authentication is now enabled!" });
      } else {
        const err = await res.json();
        toast({ title: "Verification failed", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "An error occurred", variant: "destructive" });
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDisabling2FA(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/users/me/2fa/disable"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: disablePassword }),
      });

      if (res.ok) {
        setTwoFactorEnabled(false);
        setDisable2FAModalOpen(false);
        setDisablePassword("");
        toast({ title: "Two-Factor Authentication disabled" });
      } else {
        const err = await res.json();
        toast({ title: "Failed to disable 2FA", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "An error occurred", variant: "destructive" });
    } finally {
      setIsDisabling2FA(false);
    }
  };

  return (
    <div className="space-y-10 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Password & Security Center</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your credentials, active sessions, and 2-step verification.
        </p>
      </div>

      {/* Change Password Card */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Change Password</h3>
            <p className="text-xs text-muted-foreground">Choose a unique password to protect your account</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-pwd">Current Password</Label>
            <div className="relative">
              <Input
                id="current-pwd"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-pwd">New Password</Label>
            <div className="relative">
              <Input
                id="new-pwd"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 10 characters"
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Live Password Rules Checklist */}
            <div className="p-2.5 rounded-lg border border-border bg-muted/40 space-y-1 text-[11px] mt-2">
              <div className="font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Password Requirements:
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className={`flex items-center gap-1 ${hasMinLength ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                  {hasMinLength ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 mr-0.5" />} 10+ Characters
                </span>
                <span className={`flex items-center gap-1 ${hasUpper ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                  {hasUpper ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 mr-0.5" />} Uppercase (A-Z)
                </span>
                <span className={`flex items-center gap-1 ${hasLower ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                  {hasLower ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 mr-0.5" />} Lowercase (a-z)
                </span>
                <span className={`flex items-center gap-1 ${hasNumber ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                  {hasNumber ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 mr-0.5" />} Number (0-9)
                </span>
                <span className={`col-span-2 flex items-center gap-1 ${hasSpecial ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                  {hasSpecial ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 mr-0.5" />} Special Character (!@#$%^&*...)
                </span>
              </div>
            </div>

            {/* Strength Meter */}
            {newPassword && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Password strength</span>
                  <span className="font-semibold">{strength.text}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 h-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={cn(
                        "rounded-full transition-colors duration-300",
                        step <= strength.score ? strength.color : "bg-muted"
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>


          <div className="space-y-2">
            <Label htmlFor="confirm-pwd">Confirm New Password</Label>
            <Input
              id="confirm-pwd"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              required
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={isChangingPassword} className="w-full sm:w-auto h-10 sm:h-9 text-xs font-semibold">
              {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Password
            </Button>
          </div>
        </form>
      </div>

      {/* Two-Factor Authentication (2FA) */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={cn("p-2.5 rounded-xl shrink-0", twoFactorEnabled ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
              {twoFactorEnabled ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base">Two-Factor Authentication (2FA)</h3>
                {twoFactorEnabled ? (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    Active
                  </span>
                ) : (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    Off
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Protect your account by requiring an authentication code in addition to your password.
              </p>
            </div>
          </div>

          {twoFactorEnabled ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisable2FAModalOpen(true)}
              className="text-xs font-semibold text-destructive hover:text-destructive shrink-0"
            >
              Turn Off 2FA
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleStart2FASetup}
              className="text-xs font-semibold shrink-0 bg-primary text-primary-foreground"
            >
              Enable 2FA
            </Button>
          )}
        </div>
      </div>

      {/* Active Sessions & Logged-In Devices */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Logged-In Devices ({sessions.length})</h3>
              <p className="text-xs text-muted-foreground">Devices currently authenticated to your account</p>
            </div>
          </div>
          {sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogoutAllOther}
              className="text-xs font-semibold text-destructive"
            >
              Log out other devices
            </Button>
          )}
        </div>

        <div className="divide-y divide-border">
          {sessions.map((session) => (
            <div key={session.id} className="py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                  {session.os.includes("iOS") || session.os.includes("Android") ? (
                    <Smartphone className="w-4 h-4" />
                  ) : (
                    <Laptop className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{session.deviceName}</span>
                    {session.current && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
                        Current Session
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {session.location} • IP: {session.ip}
                  </div>
                </div>
              </div>

              {!session.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTerminateSession(session.id)}
                  className="text-xs text-destructive hover:bg-destructive/10"
                >
                  Terminate
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Security Alerts / Recent Activity */}
      {alerts.length > 0 && (
        <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Security Activity & Logins</h3>
              <p className="text-xs text-muted-foreground">Recent sign-ins and security events</p>
            </div>
          </div>

          <div className="divide-y divide-border">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold">{alert.deviceName}</div>
                  <div className="text-muted-foreground">{alert.location} • IP: {alert.ip}</div>
                </div>
                <div className="text-muted-foreground">
                  {new Date(alert.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2FA Setup Dialog */}
      <Dialog open={twoFactorModalOpen} onOpenChange={setTwoFactorModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-5 h-5 text-emerald-500" /> Set Up Google Authenticator
            </DialogTitle>
            <DialogDescription className="text-xs">
              Open Google Authenticator (or any standard TOTP app) on your device, tap <strong>+</strong> and scan this QR code.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Real QR Code */}
            {twoFactorQrCode ? (
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-border">
                <img
                  src={twoFactorQrCode}
                  alt="2FA QR Code"
                  className="w-48 h-48 rounded-lg"
                />
                <span className="text-[11px] text-zinc-600 mt-1 font-medium">
                  Scan in Google Authenticator
                </span>
              </div>
            ) : null}

            {/* Manual Secret Key */}
            <div className="p-3 bg-muted/60 rounded-xl space-y-1.5 border border-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>Can't scan? Enter setup key manually:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(twoFactorSecret);
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                >
                  {copiedKey ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  {copiedKey ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="font-mono text-xs font-bold tracking-wider select-all break-all text-primary bg-background/70 p-2 rounded border border-border">
                {twoFactorSecret}
              </div>
            </div>

            {/* Emergency Backup Codes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>Emergency Backup Codes (One-Time Use)</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(twoFactorBackupCodes.join("\n"));
                    setCopiedBackup(true);
                    setTimeout(() => setCopiedBackup(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                >
                  {copiedBackup ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  {copiedBackup ? "Copied All" : "Copy All"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-2 bg-muted/40 rounded-xl border border-border text-[11px] font-mono">
                {twoFactorBackupCodes.map((code, idx) => (
                  <div key={idx} className="text-center font-bold text-foreground/90 py-1 bg-background/70 rounded border border-border/50">
                    {code}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Save these recovery codes securely. If you lose access to Google Authenticator, you can use one of these codes to sign in.
              </p>
            </div>

            {/* Verification Form */}
            <form onSubmit={handleVerify2FA} className="space-y-3 pt-1 border-t border-border">
              <Label htmlFor="verify-2fa-code" className="text-xs font-semibold">
                Enter 6-digit code shown in Google Authenticator:
              </Label>
              <Input
                id="verify-2fa-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="123456"
                className="text-center font-mono text-lg tracking-widest h-11"
                required
              />
              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setTwoFactorModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isVerifying2FA || twoFactorCode.length < 6}>
                  {isVerifying2FA ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Verify & Activate
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <Dialog open={disable2FAModalOpen} onOpenChange={setDisable2FAModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Turn Off Two-Factor Authentication
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter your current account password to confirm disabling 2FA.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDisable2FA} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="disable-pwd" className="text-xs font-semibold">Current Password</Label>
              <Input
                id="disable-pwd"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDisable2FAModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isDisabling2FA || !disablePassword}>
                {isDisabling2FA ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Turn Off 2FA
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
