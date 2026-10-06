import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Lock, User as UserIcon } from "lucide-react";

interface LoginScreenProps {
  onNavigateToSignup: () => void;
  onNavigateToForgot: () => void;
  onNavigateToVerify: (email: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToSignup,
  onNavigateToForgot,
  onNavigateToVerify,
}) => {
  const { login } = useAuth();
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login({
        login: loginInput.trim(),
        password: password.trim(),
        code: requiresTwoFactor ? twoFactorCode.trim() : undefined,
      });

      if (!result.success) {
        if (result.error?.toLowerCase().includes("2fa") || result.error?.toLowerCase().includes("two-factor")) {
          setRequiresTwoFactor(true);
        } else if (result.error?.toLowerCase().includes("verify your email")) {
          onNavigateToVerify(loginInput.trim());
        } else {
          setError(result.error || "Login failed");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between p-6 max-w-md mx-auto">
      {/* Top Brand Hero */}
      <div className="flex flex-col items-center text-center mt-12 mb-8">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-emerald-500/30 mb-4">
          W
        </div>
        <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
          WhiterChat
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[240px]">
          Connect, express, and share in high definition with your world.
        </p>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-4 flex-1">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium animate-in fade-in duration-150">
            {error}
          </div>
        )}

        <Input
          label="Username or Email"
          placeholder="e.g. alex or alex@example.com"
          value={loginInput}
          onChange={(e) => setLoginInput(e.target.value)}
          icon={<UserIcon className="w-4 h-4" />}
          autoCapitalize="none"
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="w-4 h-4" />}
          required
        />

        {requiresTwoFactor && (
          <Input
            label="Two-Factor Code (2FA)"
            placeholder="6-digit authenticator code"
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value)}
            maxLength={8}
            required
          />
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onNavigateToForgot}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Forgot Password?
          </button>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-2"
          isLoading={loading}
        >
          {requiresTwoFactor ? "Verify & Log In" : "Log In"}
        </Button>
      </form>

      {/* Bottom Switcher */}
      <div className="py-6 border-t border-zinc-200 dark:border-zinc-800 text-center">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onNavigateToSignup}
            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline ml-1"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
};
