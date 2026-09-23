import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, KeyRound, Loader2, ArrowLeft } from "lucide-react";
import { apiUrl } from "@/lib/api-url";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";

const loginSchema = z.object({
  identifier: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login: setAuth } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [cachedCredentials, setCachedCredentials] = useState<{ identifier: string; password: string } | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: data.identifier.trim(),
          password: data.password,
        }),
      });

      const response = await res.json();
      if (!res.ok) {
        if (res.status === 403 && response.unverifiedEmail) {
          toast({
            title: "Account Not Verified",
            description: "Please check your email to verify your account or complete registration.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Login failed",
          description: response.error || "Invalid credentials",
          variant: "destructive",
        });
        return;
      }

      if (response.requires2FA) {
        setRequires2FA(true);
        setCachedCredentials({ identifier: data.identifier.trim(), password: data.password });
        toast({
          title: "Two-Factor Authentication",
          description: response.message || "Please enter your 2FA security code.",
        });
        return;
      }

      setAuth(response.token, response.refreshToken, response.user);
      toast({ title: "Welcome back!" });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Network error",
        description: "Could not connect to the server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cachedCredentials || !twoFactorCode.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: cachedCredentials.identifier,
          password: cachedCredentials.password,
          twoFactorCode: twoFactorCode.trim(),
        }),
      });

      const response = await res.json();
      if (!res.ok) {
        toast({
          title: "2FA Verification Failed",
          description: response.error || "Invalid 2FA code or backup code",
          variant: "destructive",
        });
        return;
      }

      setAuth(response.token, response.refreshToken, response.user);
      toast({ title: "Authenticated successfully!" });
      setLocation("/");
    } catch {
      toast({
        title: "Verification error",
        description: "Could not complete 2FA check",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-7 bg-card p-6 sm:p-8 rounded-2xl border border-border shadow-xl"
      >
        <div className="text-center space-y-2 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary/50 p-2 ring-1 ring-border/50 shadow-md flex items-center justify-center">
            <img src="/logo.png?v=3" alt="WhiterChat Logo" className="w-full h-full object-contain rounded-xl" />
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold italic tracking-tighter mb-1">WhiterChat</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {requires2FA
              ? "Enter your 2FA code or backup code to continue"
              : "Sign in to your account with your credentials"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!requires2FA ? (
            <Form {...form} key="login-form">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Username or Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter username or email" {...field} className="h-10 text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs font-semibold">Password</FormLabel>
                        <button
                          type="button"
                          onClick={() => setIsForgotPasswordOpen(true)}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" {...field} className="h-10 text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-10 font-semibold" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Signing in...
                    </>
                  ) : (
                    "Log In"
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <motion.form
              key="2fa-form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={onVerify2FA}
              className="space-y-4"
            >
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-xs text-muted-foreground flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>
                  Two-factor authentication is active on this account. Enter the 6-digit code from your authenticator app or one of your 8-digit backup codes.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-muted-foreground" /> Security Code
                </label>
                <Input
                  placeholder="e.g. 123456 or Backup Code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  className="h-11 font-mono text-center text-lg tracking-widest"
                  autoFocus
                  required
                />
              </div>

              <Button type="submit" className="w-full h-10 font-semibold gap-2" disabled={isLoading || !twoFactorCode.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying 2FA...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Verify Code & Login
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false);
                  setTwoFactorCode("");
                }}
                className="w-full text-xs text-muted-foreground hover:text-foreground text-center flex items-center justify-center gap-1 pt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to username & password
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="text-center text-xs pt-1 border-t border-border">
          <span className="text-muted-foreground">Don't have an account? </span>
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </motion.div>

      {/* Real Email Password Reset Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialEmail={
          form.getValues("identifier").includes("@")
            ? form.getValues("identifier")
            : ""
        }
        onSuccessLogin={(email) => {
          form.setValue("identifier", email);
          toast({
            title: "Password updated!",
            description: "Please sign in with your new password.",
          });
        }}
      />
    </div>
  );
}
