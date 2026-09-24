import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Mail, ArrowLeft } from "lucide-react";

interface VerifyOtpScreenProps {
  email: string;
  onNavigateToLogin: () => void;
}

export const VerifyOtpScreen: React.FC<VerifyOtpScreenProps> = ({
  email,
  onNavigateToLogin,
}) => {
  const { verifyOtp, resendOtp } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Please enter all 6 digits of the verification code");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await verifyOtp({ email, code });
      if (!res.success) {
        setError(res.error || "Invalid verification code");
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setSuccessMsg(null);

    const res = await resendOtp(email);
    if (res.success) {
      setSuccessMsg("A fresh 6-digit code has been sent to your email.");
      setResendCooldown(60);
    } else {
      setError(res.error || "Failed to resend code");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between p-6 max-w-md mx-auto">
      {/* Top Header */}
      <div>
        <button
          onClick={onNavigateToLogin}
          className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </button>

        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
          <Mail className="w-7 h-7" />
        </div>

        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Verify Your Email
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          We sent a 6-digit code to <span className="font-semibold text-zinc-800 dark:text-zinc-200">{email}</span>. Please enter it below.
        </p>
      </div>

      {/* Code Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4 my-auto">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {successMsg}
          </div>
        )}

        <div className="flex justify-center my-6">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="000000"
            className="w-48 h-14 text-center tracking-[0.5em] text-2xl font-mono font-bold bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 rounded-2xl focus:outline-none"
            autoFocus
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={loading}
          disabled={code.length !== 6}
        >
          Confirm & Log In
        </Button>
      </form>

      {/* Resend Action */}
      <div className="py-4 text-center border-t border-zinc-200 dark:border-zinc-800">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Didn't receive the code?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="font-bold text-emerald-600 dark:text-emerald-400 disabled:opacity-50 hover:underline ml-1"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
          </button>
        </p>
      </div>
    </div>
  );
};
