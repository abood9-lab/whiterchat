import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  RotateCw,
} from "lucide-react";
import { apiUrl } from "@/lib/api-url";

import { getSavedEmailConfig, dispatchClientEmail } from "@/lib/client-email";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onSuccessLogin?: (email: string) => void;
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
  initialEmail = "",
  onSuccessLogin,
}: ForgotPasswordModalProps) {
  const { toast } = useToast();

  // Multi-step: 1 = Enter Email, 2 = Enter 6-digit Code, 3 = Enter New Password, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [email, setEmail] = useState(initialEmail);
  const [resetCode, setResetCode] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Client-side email dispatching states
  const [clientDispatchRequired, setClientDispatchRequired] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [clientDispatchStatus, setClientDispatchStatus] = useState<"idle" | "sending" | "success" | "failed">("idle");
  const [clientDispatchError, setClientDispatchError] = useState("");

  // Sync initial email when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialEmail && !email) {
        setEmail(initialEmail);
      }
      setErrorMessage("");
    }
  }, [isOpen, initialEmail]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Password rules validation
  const hasMinLength = newPassword.length >= 10;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;

  // Step 1: Send Password Reset Code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (res.ok) {
        setStep(2);
        setResendCooldown(60);

        if (data.clientDispatchRequired) {
          setClientDispatchRequired(true);
          setGeneratedOtp(data.otpCode);
          setClientDispatchStatus("sending");
          setClientDispatchError("");

          const result = await dispatchClientEmail(cleanEmail, data.otpCode, "password_reset");
          if (result.success) {
            setClientDispatchStatus("success");
            toast({
              title: "Client-side delivery success!",
              description: `Verification email sent successfully using ${result.provider} from your device.`,
            });
          } else {
            setClientDispatchStatus("failed");
            setClientDispatchError(result.error || "Device was unable to connect to client-side email provider.");
            toast({
              title: "Local Fallback Enabled",
              description: "Could not deliver recovery email. Recovery code shown on screen.",
            });
          }
        } else {
          setClientDispatchRequired(false);
          setGeneratedOtp("");
          setClientDispatchStatus("idle");
          toast({
            title: "Recovery email sent",
            description: data.message || "A 6-digit code has been sent to your email.",
          });
        }
      } else {
        setErrorMessage(data.error || "Failed to process password reset request");
      }
    } catch {
      setErrorMessage("Network connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify 6-digit Reset Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = resetCode.trim();
    if (cleanCode.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch(apiUrl("/api/auth/verify-reset-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: cleanCode,
        }),
      });

      const data = await res.json();
      if (res.ok && data.resetToken) {
        setResetToken(data.resetToken);
        setStep(3);
        toast({
          title: "Code verified",
          description: "Please enter and confirm your new password.",
        });
      } else {
        setErrorMessage(data.error || "Invalid or expired reset code");
      }
    } catch {
      setErrorMessage("Network error while verifying code");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code handler
  const handleResendCode = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendCooldown(60);

        if (data.clientDispatchRequired) {
          setClientDispatchRequired(true);
          setGeneratedOtp(data.otpCode);
          setClientDispatchStatus("sending");
          setClientDispatchError("");

          const result = await dispatchClientEmail(email.trim().toLowerCase(), data.otpCode, "password_reset");
          if (result.success) {
            setClientDispatchStatus("success");
            toast({
              title: "Client-side delivery success!",
              description: `Verification email resent successfully using ${result.provider} from your device.`,
            });
          } else {
            setClientDispatchStatus("failed");
            setClientDispatchError(result.error || "Device was unable to connect to client-side email provider.");
            toast({
              title: "Local Fallback Enabled",
              description: "Could not deliver email. Recovery code shown on screen.",
            });
          }
        } else {
          setClientDispatchRequired(false);
          setGeneratedOtp("");
          setClientDispatchStatus("idle");
          toast({
            title: "New code sent",
            description: "Check your email for the new 6-digit code.",
          });
        }
      } else {
        setErrorMessage(data.error || "Could not resend reset code");
      }
    } catch {
      setErrorMessage("Network error while resending code");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Submit New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setErrorMessage("Password does not meet all security requirements");
      return;
    }
    if (!isMatching) {
      setErrorMessage("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch(apiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          resetToken,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStep(4);
        toast({
          title: "Password Reset Successful",
          description: "You can now log in with your new password.",
        });
      } else {
        setErrorMessage(data.error || "Failed to update password. Session may have expired.");
      }
    } catch {
      setErrorMessage("Network error while updating password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishAndLogin = () => {
    onClose();
    if (onSuccessLogin) {
      onSuccessLogin(email.trim().toLowerCase());
    }
    // Reset state for future usage
    setTimeout(() => {
      setStep(1);
      setResetCode("");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
      setErrorMessage("");
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-none sm:max-w-md bg-card border-t sm:border border-border rounded-t-[28px] sm:rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-7 max-h-[90dvh] overflow-y-auto pb-[max(1.5rem,calc(1.5rem+env(safe-area-inset-bottom)))] sm:pb-7"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="mx-auto -mt-3 mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/30 sm:hidden shrink-0 pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {step === 1 && "Reset Password"}
                {step === 2 && "Enter Verification Code"}
                {step === 3 && "Create New Password"}
                {step === 4 && "Password Updated"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {step === 1 && "Enter your email to receive a recovery code"}
                {step === 2 && "Check your email for the 6-digit code"}
                {step === 3 && "Choose a strong, secure password"}
                {step === 4 && "Account recovered successfully"}
              </p>
            </div>
          </div>
          {step !== 4 && (
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1 rounded-md hover:bg-muted transition"
            >
              ✕
            </button>
          )}
        </div>

        {/* Error Callout */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <motion.form
              key="step-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleRequestCode}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email Address
                </label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 text-sm"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  We will send a real 6-digit confirmation code to this email address.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-10 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="flex-1 h-10 text-sm font-semibold gap-1.5"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      Send Code <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </motion.form>
          )}

          {/* STEP 2: Enter 6-Digit Code */}
          {step === 2 && (
            <motion.form
              key="step-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleVerifyCode}
              className="space-y-4"
            >
              <div className="p-3 bg-muted/50 border border-border rounded-xl text-xs space-y-1 text-muted-foreground">
                <p>
                  A real verification code was sent to:{" "}
                  <strong className="text-foreground font-semibold">{email}</strong>
                </p>
                <p className="text-[11px]">Code expires in 10 minutes. Check your inbox or spam folder.</p>
              </div>

              {clientDispatchRequired && (
                <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                    <Info className="w-4 h-4" /> Client-Side Recovery Status
                  </div>
                  {clientDispatchStatus === "sending" && (
                    <p className="text-muted-foreground animate-pulse">
                      Sending recovery email directly from your browser device using local dispatch...
                    </p>
                  )}
                  {clientDispatchStatus === "success" && (
                    <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Recovery email sent to {email}! Check your inbox.
                    </p>
                  )}
                  {clientDispatchStatus === "failed" && (
                    <div className="space-y-1">
                      <p className="text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                        ⚠️ Free Tier Fallback: The code was generated securely on the server but could not be emailed automatically.
                      </p>
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-center text-sm font-semibold tracking-wider font-mono select-all text-amber-700 dark:text-amber-300">
                        {generatedOtp}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Use this code above to instantly recover your password. (Never blocked!)
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 text-center">
                <label className="text-xs font-semibold text-foreground block">
                  6-Digit Verification Code
                </label>
                <div className="flex justify-center">
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-12 w-48 text-center font-mono text-2xl tracking-[0.35em] font-bold border-2"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Change Email
                </button>

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-primary hover:underline font-semibold flex items-center gap-1 disabled:opacity-50 disabled:no-underline"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend Code"}
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading || resetCode.trim().length !== 6}
                className="w-full h-10 font-semibold gap-1.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying Code...
                  </>
                ) : (
                  <>
                    Verify Code <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </motion.form>
          )}

          {/* STEP 3: Enter New Password */}
          {step === 3 && (
            <motion.form
              key="step-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleResetPassword}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" /> New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-10 pr-10 text-sm"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3 bg-muted/40 border border-border/80 rounded-xl space-y-1.5 text-xs">
                <span className="font-semibold text-foreground text-[11px] block">Security Requirements:</span>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <span className={`flex items-center gap-1.5 ${hasMinLength ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                    {hasMinLength ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} 10+ characters
                  </span>
                  <span className={`flex items-center gap-1.5 ${hasUpper ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                    {hasUpper ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} 1 uppercase (A-Z)
                  </span>
                  <span className={`flex items-center gap-1.5 ${hasLower ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                    {hasLower ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} 1 lowercase (a-z)
                  </span>
                  <span className={`flex items-center gap-1.5 ${hasNumber ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                    {hasNumber ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} 1 number (0-9)
                  </span>
                  <span className={`flex items-center gap-1.5 col-span-2 ${hasSpecial ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                    {hasSpecial ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} 1 special character (!@#$%...)
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" /> Confirm Password
                </label>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 text-sm"
                  required
                />
                {confirmPassword && !isMatching && (
                  <p className="text-[11px] text-destructive">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading || !isPasswordValid || !isMatching}
                className="w-full h-10 font-semibold gap-1.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving Password...
                  </>
                ) : (
                  <>
                    Save New Password <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </motion.form>
          )}

          {/* STEP 4: Success */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4 space-y-4"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Password Reset Complete!</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your WhiterChat account password has been updated securely. You can now sign in using your new credentials.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleFinishAndLogin}
                className="w-full h-10 font-semibold"
              >
                Proceed to Sign In
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
