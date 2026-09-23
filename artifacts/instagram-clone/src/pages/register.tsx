import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  ShieldCheck,
  ArrowRight,
  Mail,
  User,
  Lock,
  RefreshCw,
  Loader2,
  KeyRound,
  ArrowLeft,
  Info,
} from "lucide-react";

export default function Register() {
  const { login: setAuth } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Step state: 1 = Details, 2 = Email OTP verification
  const [step, setStep] = useState<1 | 2>(1);

  // Form states
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // Validation & availability states
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [usernameMsg, setUsernameMsg] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [emailMsg, setEmailMsg] = useState("");

  // Submission & resend states
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Password rules check
  const hasMinLength = password.length >= 10;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const isPasswordsMatch = password && confirmPassword && password === confirmPassword;

  // Username live check debounce
  useEffect(() => {
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) {
      setUsernameStatus("idle");
      setUsernameMsg("");
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUser)) {
      setUsernameStatus("invalid");
      setUsernameMsg("3-30 chars, English letters, numbers & _ only");
      return;
    }

    setUsernameStatus("checking");
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/api/auth/check-username?username=${encodeURIComponent(cleanUser)}`));
        const data = await res.json();
        if (data.available) {
          setUsernameStatus("available");
          setUsernameMsg("Username is available");
        } else {
          setUsernameStatus("taken");
          setUsernameMsg(data.message || "Username is already taken");
        }
      } catch {
        setUsernameStatus("idle");
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [username]);

  // Email live check debounce
  useEffect(() => {
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!cleanEmail) {
      setEmailStatus("idle");
      setEmailMsg("");
      return;
    }

    if (!emailRegex.test(cleanEmail)) {
      setEmailStatus("invalid");
      setEmailMsg("Please enter a valid email address");
      return;
    }

    setEmailStatus("checking");
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/api/auth/check-email?email=${encodeURIComponent(cleanEmail)}`));
        const data = await res.json();
        if (data.available) {
          setEmailStatus("available");
          setEmailMsg("Email is available");
        } else {
          setEmailStatus("taken");
          setEmailMsg("Email is already registered");
        }
      } catch {
        setEmailStatus("idle");
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [email]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle Step 1: Submit Details & Request OTP
  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast({ title: "Please enter your full name", variant: "destructive" });
      return;
    }
    if (usernameStatus !== "available") {
      toast({ title: "Please choose a valid and available username", variant: "destructive" });
      return;
    }
    if (emailStatus !== "available") {
      toast({ title: "Please enter a valid, unregistered email", variant: "destructive" });
      return;
    }
    if (!isPasswordValid) {
      toast({ title: "Password does not meet the security policy", variant: "destructive" });
      return;
    }
    if (!isPasswordsMatch) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStep(2);
        setResendCooldown(60);
        toast({
          title: "Verification code sent!",
          description: data.message || `We've sent a 6-digit code to ${email}`,
        });
      } else {
        toast({
          title: "Registration error",
          description: data.error || "Failed to initiate registration",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Network error",
        description: "Could not connect to the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.trim();
    if (cleanCode.length !== 6) {
      toast({ title: "Please enter the 6-digit code", variant: "destructive" });
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch(apiUrl("/api/auth/verify-registration"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: cleanCode,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAuth(data.token, data.refreshToken, data.user);
        toast({
          title: "Account created successfully!",
          description: "Welcome to WhiterChat.",
        });
        setLocation("/");
      } else {
        toast({
          title: "Verification failed",
          description: data.error || "Incorrect or expired code",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Network error",
        description: "Could not verify code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend code
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/resend-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (res.ok) {
        setResendCooldown(60);
        toast({ title: "New code sent!", description: data.message });
      } else {
        toast({
          title: "Failed to resend",
          description: data.error || "Please wait before trying again",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Failed to resend code", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card p-6 sm:p-8 rounded-2xl border border-border shadow-xl space-y-6"
      >
        {/* Brand Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary/50 p-2 ring-1 ring-border/50 shadow-md flex items-center justify-center">
            <img src="/logo.png?v=3" alt="WhiterChat Logo" className="w-full h-full object-contain rounded-xl" />
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold italic tracking-tight text-foreground">
            WhiterChat
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {step === 1
              ? "Create a secure account to join our community"
              : "Verify your email address to complete registration"}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 pt-1 pb-1">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              step === 1 ? "w-10 bg-primary" : "w-2 bg-muted-foreground/30"
            }`}
          />
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              step === 2 ? "w-10 bg-primary" : "w-2 bg-muted-foreground/30"
            }`}
          />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            /* STEP 1: REGISTRATION DETAILS FORM */
            <motion.form
              key="step-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleSubmitDetails}
              className="space-y-4"
            >
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" /> Full Name
                </label>
                <Input
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={60}
                  required
                  className="h-10 text-sm"
                />
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" /> Username
                  </label>
                  {usernameStatus === "checking" && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                    </span>
                  )}
                  {usernameStatus === "available" && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> Available
                    </span>
                  )}
                  {usernameStatus === "taken" && (
                    <span className="text-[11px] text-red-500 font-medium flex items-center gap-1">
                      <X className="w-3 h-3" /> Taken
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">@</span>
                  <Input
                    placeholder="english_letters_only"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    maxLength={30}
                    required
                    className="h-10 text-sm pl-7 font-mono"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  English letters, numbers & underscores only (3-30 characters).
                </p>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email Address
                  </label>
                  {emailStatus === "checking" && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                    </span>
                  )}
                  {emailStatus === "available" && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> Valid
                    </span>
                  )}
                  {emailStatus === "taken" && (
                    <span className="text-[11px] text-red-500 font-medium flex items-center gap-1">
                      <X className="w-3 h-3" /> Registered
                    </span>
                  )}
                </div>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  required
                  className="h-10 text-sm"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" /> Password
                </label>
                <Input
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 text-sm"
                />

                {/* Live Password Rules Checklist */}
                <div className="p-2.5 rounded-lg border border-border bg-muted/40 space-y-1 text-[11px]">
                  <div className="font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Password Security Requirements:
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
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" /> Confirm Password
                  </label>
                  {confirmPassword && (
                    <span
                      className={`text-[11px] font-medium flex items-center gap-1 ${
                        isPasswordsMatch ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                      }`}
                    >
                      {isPasswordsMatch ? (
                        <>
                          <Check className="w-3 h-3" /> Matches
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" /> Doesn't match
                        </>
                      )}
                    </span>
                  )}
                </div>
                <Input
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-10 text-sm"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 font-semibold text-sm gap-2 mt-2"
                disabled={isLoading || !isPasswordValid || !isPasswordsMatch || usernameStatus !== "available"}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Preparing Account...
                  </>
                ) : (
                  <>
                    Continue <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </motion.form>
          ) : (
            /* STEP 2: EMAIL OTP VERIFICATION FORM */
            <motion.form
              key="step-2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleVerifyOtp}
              className="space-y-5"
            >
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                  <Mail className="w-4 h-4" /> Verification Email Sent
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We've sent a 6-digit verification code to{" "}
                  <strong className="text-foreground font-medium">{email}</strong>.
                  Please enter the code to activate your account.
                </p>
              </div>

              <div className="p-3 bg-muted/50 border border-border/60 rounded-xl text-xs space-y-1 text-muted-foreground">
                <div className="flex items-center gap-1.5 font-medium text-foreground text-[11px]">
                  <span>📧 Tip: Check your inbox or spam folder</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Real emails usually arrive within 5–30 seconds. If you do not see it in your primary inbox, please check your spam or promotions folder.
                </p>
              </div>

              {/* 6-Digit Code Input */}
              <div className="space-y-2 text-center">
                <label className="text-xs font-semibold text-foreground block">
                  6-Digit Verification Code
                </label>
                <div className="flex justify-center">
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-14 w-52 text-center font-mono text-2xl tracking-[0.4em] font-bold border-2"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  The code will expire in 10 minutes.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold text-sm gap-2"
                  disabled={isVerifying || otpCode.trim().length !== 6}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying Code...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" /> Verify & Activate Account
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to details
                  </button>

                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0 || isLoading}
                    className={`font-semibold flex items-center gap-1 ${
                      resendCooldown > 0
                        ? "text-muted-foreground/60 cursor-not-allowed"
                        : "text-primary hover:underline"
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Footer Login Link */}
        <div className="text-center text-xs pt-2 border-t border-border">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
