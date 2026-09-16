import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { useGetMe, setAuthTokenGetter, setOnUnauthorized } from "@workspace/api-client-react";
import type { UserProfile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiUrl } from "./api-url";

export interface StoredAccount {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  token: string;
  refreshToken: string;
  lastActiveAt: number;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  accounts: StoredAccount[];
  login: (token: string, refreshToken: string, user: UserProfile) => void;
  logout: () => void;
  logoutAccount: (accountId: string) => void;
  switchAccount: (accountId: string) => Promise<boolean>;
  addAccount: (token: string, refreshToken: string, user: UserProfile) => void;
  updateUser: (user: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "whiterchat_token";
const REFRESH_KEY = "whiterchat_refresh_token";
const ACCOUNTS_KEY = "whiterchat_saved_accounts";

// Keep a module-level ref to the latest token so the getter always returns
// the most recent value without needing React state.
let _latestToken: string | null = localStorage.getItem(TOKEN_KEY);

setAuthTokenGetter(() => _latestToken);

function getSavedAccountsFromStorage(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoredAccount =>
        Boolean(item && typeof item === "object" && typeof (item.id || (item as any)._id) === "string" && typeof item.username === "string")
    ).map((item) => ({
      ...item,
      id: item.id || (item as any)._id,
    }));
  } catch {
    return [];
  }
}

function persistAccounts(accounts: StoredAccount[]) {
  try {
    const safeAccounts = (Array.isArray(accounts) ? accounts : []).filter(
      (a): a is StoredAccount => Boolean(a && typeof a.id === "string")
    );
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(safeAccounts));
  } catch {
    // Ignore storage quota errors
  }
}

async function attemptRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    const res = await fetch(apiUrl("/api/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      // Refresh failed — clear stored tokens ONLY if server confirmed 401 (revoked or invalid)
      if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        _latestToken = null;
      }
      return null;
    }
    const data = (await res.json()) as { token: string; refreshToken: string };
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(REFRESH_KEY, data.refreshToken);
    _latestToken = data.token;

    // Also update this token in saved accounts
    const saved = getSavedAccountsFromStorage();
    const updated = saved.map((acc) =>
      acc.refreshToken === refreshToken
        ? { ...acc, token: data.token, refreshToken: data.refreshToken }
        : acc
    );
    persistAccounts(updated);

    return data.token;
  } catch {
    return null;
  }
}

setOnUnauthorized(attemptRefresh);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [accounts, setAccounts] = useState<StoredAccount[]>(() => getSavedAccountsFromStorage());
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const loggingOut = useRef(false);

  const { data: user, isLoading: isUserLoading, error } = useGetMe({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: { enabled: !!token, retry: false } as any,
  });

  // Whenever current user or token changes, keep saved accounts in sync
  useEffect(() => {
    const userId = user?.id || (user as any)?._id;
    if (userId && token) {
      const refreshToken = localStorage.getItem(REFRESH_KEY) || "";
      setAccounts((prev) => {
        const safePrev = (Array.isArray(prev) ? prev : []).filter((a): a is StoredAccount => Boolean(a && a.id));
        const existingIdx = safePrev.findIndex((a) => a.id === userId);
        const newEntry: StoredAccount = {
          id: userId,
          username: user.username,
          fullName: user.fullName || null,
          avatarUrl: user.avatarUrl || null,
          token,
          refreshToken,
          lastActiveAt: Date.now(),
        };
        let updated: StoredAccount[];
        if (existingIdx >= 0) {
          updated = [...safePrev];
          updated[existingIdx] = newEntry;
        } else {
          updated = [newEntry, ...safePrev];
        }
        persistAccounts(updated);
        return updated;
      });
    }
  }, [user, token]);

  useEffect(() => {
    if (error && !loggingOut.current) {
      const is401 = (error as any)?.status === 401;
      if (is401) {
        console.warn("[Auth] 401 Unauthorized from /api/auth/me after refresh attempt. Logging out.");
        logout();
      } else {
        console.warn("[Auth] Non-401 error from /api/auth/me (Network/Server glitch). Retaining session.");
      }
    }
  }, [error]);

  const login = (newToken: string, newRefreshToken: string, newUser: UserProfile) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(REFRESH_KEY, newRefreshToken);
    _latestToken = newToken;
    setToken(newToken);

    const userId = newUser.id || (newUser as any)._id;

    // Save to accounts list
    setAccounts((prev) => {
      const safePrev = (Array.isArray(prev) ? prev : []).filter((a): a is StoredAccount => Boolean(a && a.id));
      const filtered = safePrev.filter((a) => a.id !== userId);
      const updated = [
        {
          id: userId,
          username: newUser.username,
          fullName: newUser.fullName || null,
          avatarUrl: newUser.avatarUrl || null,
          token: newToken,
          refreshToken: newRefreshToken,
          lastActiveAt: Date.now(),
        },
        ...filtered,
      ];
      persistAccounts(updated);
      return updated;
    });

    queryClient.setQueryData(["/api/auth/me"], newUser);
    setLocation(newUser.profileCompleted ? "/" : "/setup-profile");
  };

  const addAccount = (newToken: string, newRefreshToken: string, newUser: UserProfile) => {
    // Similar to login but called when connecting a secondary account
    login(newToken, newRefreshToken, newUser);
  };

  const switchAccount = async (accountId: string): Promise<boolean> => {
    const target = accounts.find((a) => a.id === accountId);
    if (!target) return false;

    // First, verify or test the token
    localStorage.setItem(TOKEN_KEY, target.token);
    localStorage.setItem(REFRESH_KEY, target.refreshToken);
    _latestToken = target.token;
    setToken(target.token);

    // Invalidate react-query cache so all feed, profile, chats reload for new user
    queryClient.clear();

    try {
      const res = await fetch(apiUrl("/api/auth/me"), {
        headers: { Authorization: `Bearer ${target.token}` },
      });
      if (res.ok) {
        const newUser = (await res.json()) as UserProfile;
        queryClient.setQueryData(["/api/auth/me"], newUser);
        // update lastActiveAt
        setAccounts((prev) => {
          const updated = prev.map((a) =>
            a.id === accountId ? { ...a, lastActiveAt: Date.now() } : a
          );
          persistAccounts(updated);
          return updated;
        });
        setLocation("/");
        return true;
      } else {
        // Try refresh
        const refreshedToken = await attemptRefresh();
        if (refreshedToken) {
          const retryRes = await fetch(apiUrl("/api/auth/me"), {
            headers: { Authorization: `Bearer ${refreshedToken}` },
          });
          if (retryRes.ok) {
            const newUser = (await retryRes.json()) as UserProfile;
            queryClient.setQueryData(["/api/auth/me"], newUser);
            setLocation("/");
            return true;
          }
        }
        // Account token expired and could not refresh
        return false;
      }
    } catch {
      return false;
    }
  };

  const logoutAccount = (accountId: string) => {
    const target = accounts.find((a) => a.id === accountId);
    if (target?.refreshToken) {
      fetch(apiUrl("/api/auth/logout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: target.refreshToken }),
      }).catch(() => {});
    }

    const remaining = accounts.filter((a) => a.id !== accountId);
    setAccounts(remaining);
    persistAccounts(remaining);

    // If currently logged into this account, switch to next available or log out completely
    if (user?.id === accountId) {
      if (remaining.length > 0) {
        switchAccount(remaining[0].id);
      } else {
        logout();
      }
    }
  };

  const logout = () => {
    loggingOut.current = true;
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    // Fire-and-forget revocation — don't block the UI
    if (refreshToken) {
      fetch(apiUrl("/api/auth/logout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }

    // Remove active account from accounts list or keep according to user preference
    if (user) {
      const remaining = accounts.filter((a) => a.id !== user.id);
      setAccounts(remaining);
      persistAccounts(remaining);
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    _latestToken = null;
    setToken(null);
    queryClient.clear();
    setLocation("/login");
    setTimeout(() => { loggingOut.current = false; }, 500);
  };

  const updateUser = (newUser: UserProfile) => {
    queryClient.setQueryData(["/api/auth/me"], newUser);
    setAccounts((prev) => {
      const updated = prev.map((a) =>
        a.id === newUser.id
          ? {
              ...a,
              username: newUser.username,
              fullName: newUser.fullName || null,
              avatarUrl: newUser.avatarUrl || null,
            }
          : a
      );
      persistAccounts(updated);
      return updated;
    });
  };

  const isLoading = isUserLoading && !!token;

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        token,
        isLoading,
        accounts,
        login,
        logout,
        logoutAccount,
        switchAccount,
        addAccount,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

