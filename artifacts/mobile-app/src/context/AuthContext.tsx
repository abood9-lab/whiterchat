import React, { createContext, useContext, useEffect, useState } from "react";
import { mobileApi } from "../services/api/client";
import { MobileStorage } from "../services/storage";
import type { User, AuthSession } from "../types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (params: { login: string; password?: string; code?: string }) => Promise<{ success: boolean; error?: string }>;
  signup: (params: { username: string; email: string; password: string; displayName: string }) => Promise<{ success: boolean; requiresVerification?: boolean; email?: string; error?: string }>;
  verifyOtp: (params: { email: string; code: string }) => Promise<{ success: boolean; error?: string }>;
  resendOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from MobileStorage on App Launch
  useEffect(() => {
    async function restoreSession() {
      try {
        const savedToken = await MobileStorage.getItem("whiterchat_mobile_token");
        const savedUserJson = await MobileStorage.getItem("whiterchat_mobile_user");

        if (savedToken && savedUserJson) {
          const parsedUser = JSON.parse(savedUserJson);
          setToken(savedToken);
          setUser(parsedUser);

          // Verify with server in background
          const res = await mobileApi.getCurrentUser();
          if (res.data?.user) {
            setUser(res.data.user);
            await MobileStorage.setItem("whiterchat_mobile_user", JSON.stringify(res.data.user));
          } else if (res.status === 401) {
            // Token expired
            await MobileStorage.removeItem("whiterchat_mobile_token");
            await MobileStorage.removeItem("whiterchat_mobile_user");
            setToken(null);
            setUser(null);
          }
        }
      } catch {
        // storage parsing error
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (params: { login: string; password?: string; code?: string }) => {
    const res = await mobileApi.login(params);
    if (res.error) {
      return { success: false, error: res.error };
    }
    if (res.data) {
      setUser(res.data.user);
      setToken(res.data.token);
      await MobileStorage.setItem("whiterchat_mobile_token", res.data.token);
      await MobileStorage.setItem("whiterchat_mobile_user", JSON.stringify(res.data.user));
      return { success: true };
    }
    return { success: false, error: "Login failed" };
  };

  const signup = async (params: { username: string; email: string; password: string; displayName: string }) => {
    const res = await mobileApi.register(params);
    if (res.error) {
      return { success: false, error: res.error };
    }
    if (res.data?.requiresVerification) {
      return { success: true, requiresVerification: true, email: params.email };
    }
    if (res.data?.user && res.data?.token) {
      setUser(res.data.user);
      setToken(res.data.token);
      await MobileStorage.setItem("whiterchat_mobile_token", res.data.token);
      await MobileStorage.setItem("whiterchat_mobile_user", JSON.stringify(res.data.user));
      return { success: true };
    }
    return { success: true };
  };

  const verifyOtp = async (params: { email: string; code: string }) => {
    const res = await mobileApi.verifyOtp(params);
    if (res.error) {
      return { success: false, error: res.error };
    }
    if (res.data?.user && res.data?.token) {
      setUser(res.data.user);
      setToken(res.data.token);
      await MobileStorage.setItem("whiterchat_mobile_token", res.data.token);
      await MobileStorage.setItem("whiterchat_mobile_user", JSON.stringify(res.data.user));
      return { success: true };
    }
    return { success: false, error: "Verification succeeded but session was not returned" };
  };

  const resendOtp = async (email: string) => {
    const res = await mobileApi.resendOtp({ email });
    if (res.error) {
      return { success: false, error: res.error };
    }
    return { success: true };
  };

  const logout = async () => {
    await MobileStorage.removeItem("whiterchat_mobile_token");
    await MobileStorage.removeItem("whiterchat_mobile_user");
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated: Partial<User>) => {
    if (!user) return;
    const nextUser = { ...user, ...updated };
    setUser(nextUser);
    MobileStorage.setItem("whiterchat_mobile_user", JSON.stringify(nextUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        signup,
        verifyOtp,
        resendOtp,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
