import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Lock, Mail, User as UserIcon, Smile } from "lucide-react";

interface SignupScreenProps {
  onNavigateToLogin: () => void;
  onNavigateToVerify: (email: string) => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({
  onNavigateToLogin,
  onNavigateToVerify,
}) => {
  const { signup } = useAuth();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 10) {
      setError("Password must be at least 10 characters long");
      return;
    }

    setLoading(true);

    try {
      const result = await signup({
        username: username.trim().toLowerCase(),
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (!result.success) {
        setError(result.error || "Signup failed");
      } else if (result.requiresVerification && result.email) {
        onNavigateToVerify(result.email);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between p-6 max-w-md mx-auto">
      {/* Top Header */}
      <div className="flex flex-col items-center text-center mt-6 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-emerald-500/20 mb-3">
          W
        </div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
          Create Account
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Join WhiterChat to experience the new standard of social.
        </p>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-3.5 flex-1">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium animate-in fade-in">
            {error}
          </div>
        )}

        <Input
          label="Username"
          placeholder="e.g. alexander"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._]/g, ""))}
          icon={<UserIcon className="w-4 h-4" />}
          autoCapitalize="none"
          required
        />

        <Input
          label="Display Name"
          placeholder="e.g. Alex Sterling"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          icon={<Smile className="w-4 h-4" />}
          required
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="e.g. alex@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="w-4 h-4" />}
          autoCapitalize="none"
          required
        />

        <Input
          label="Password (min 10 characters)"
          type="password"
          placeholder="Create a strong password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="w-4 h-4" />}
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-3"
          isLoading={loading}
        >
          Create Account
        </Button>
      </form>

      {/* Bottom Switcher */}
      <div className="py-4 border-t border-zinc-200 dark:border-zinc-800 text-center">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline ml-1"
          >
            Log In
          </button>
        </p>
      </div>
    </div>
  );
};
