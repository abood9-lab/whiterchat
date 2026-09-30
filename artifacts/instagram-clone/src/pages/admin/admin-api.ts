import { apiUrl } from "@/lib/api-url";

function getAuthHeaders(token?: string | null): HeadersInit {
  const currentToken = token || localStorage.getItem("pixlr_token");
  return {
    "Content-Type": "application/json",
    ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
  };
}

export async function adminFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const url = apiUrl(`/api/admin${endpoint}`);
  const headers = {
    ...getAuthHeaders(token),
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export const adminApi = {
  getMe: (token?: string | null) => adminFetch<{ admin: any }>("/me", {}, token),
  
  bootstrapClaim: (token?: string | null) =>
    adminFetch<{ success: boolean; role: string; message: string }>(
      "/bootstrap-claim",
      { method: "POST" },
      token
    ),

  getMetrics: (range = "30d", token?: string | null) =>
    adminFetch<any>(`/metrics?range=${range}`, {}, token),

  getUsers: (params: Record<string, any> = {}, token?: string | null) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });
    return adminFetch<any>(`/users?${qs.toString()}`, {}, token);
  },

  getUserDetails: (id: string, token?: string | null) =>
    adminFetch<any>(`/users/${id}`, {}, token),

  updateUserStatus: (
    id: string,
    body: { action: string; reason?: string; isVerified?: boolean },
    token?: string | null
  ) =>
    adminFetch<any>(
      `/users/${id}/status`,
      { method: "PATCH", body: JSON.stringify(body) },
      token
    ),

  updateUserRole: (
    id: string,
    body: { role: string; reason?: string },
    token?: string | null
  ) =>
    adminFetch<any>(
      `/users/${id}/role`,
      { method: "PATCH", body: JSON.stringify(body) },
      token
    ),

  terminateUserSessions: (id: string, reason?: string, token?: string | null) =>
    adminFetch<any>(
      `/users/${id}/terminate-sessions`,
      { method: "POST", body: JSON.stringify({ reason }) },
      token
    ),

  getReports: (params: Record<string, any> = {}, token?: string | null) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });
    return adminFetch<any>(`/reports?${qs.toString()}`, {}, token);
  },

  updateReport: (
    id: string,
    body: { status: string; notes?: string; actionTaken?: string },
    token?: string | null
  ) =>
    adminFetch<any>(
      `/reports/${id}`,
      { method: "PATCH", body: JSON.stringify(body) },
      token
    ),

  getContent: (params: Record<string, any> = {}, token?: string | null) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });
    return adminFetch<any>(`/content?${qs.toString()}`, {}, token);
  },

  deleteContent: (id: string, reason?: string, token?: string | null) =>
    adminFetch<any>(
      `/content/${id}`,
      { method: "DELETE", body: JSON.stringify({ reason }) },
      token
    ),

  getComments: (params: Record<string, any> = {}, token?: string | null) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });
    return adminFetch<any>(`/comments?${qs.toString()}`, {}, token);
  },

  deleteComment: (postId: string, commentId: string, reason?: string, token?: string | null) =>
    adminFetch<any>(
      `/comments/${postId}/${commentId}`,
      { method: "DELETE", body: JSON.stringify({ reason }) },
      token
    ),

  getStories: (params: Record<string, any> = {}, token?: string | null) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });
    return adminFetch<any>(`/stories?${qs.toString()}`, {}, token);
  },

  deleteStory: (id: string, reason?: string, token?: string | null) =>
    adminFetch<any>(
      `/stories/${id}`,
      { method: "DELETE", body: JSON.stringify({ reason }) },
      token
    ),

  getFeedback: (params: Record<string, any> = {}, token?: string | null) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });
    return adminFetch<any>(`/feedback?${qs.toString()}`, {}, token);
  },

  updateFeedback: (
    id: string,
    body: { status?: string; replyText?: string; isInternal?: boolean },
    token?: string | null
  ) =>
    adminFetch<any>(
      `/feedback/${id}`,
      { method: "PATCH", body: JSON.stringify(body) },
      token
    ),

  getAuditLogs: (params: Record<string, any> = {}, token?: string | null) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });
    return adminFetch<any>(`/audit-logs?${qs.toString()}`, {}, token);
  },

  getSecurityEvents: (token?: string | null) =>
    adminFetch<any>("/security/events", {}, token),

  searchGlobal: (query: string, token?: string | null) =>
    adminFetch<any>(`/search?q=${encodeURIComponent(query)}`, {}, token),

  getSettings: (token?: string | null) =>
    adminFetch<{ settings: any }>("/settings", {}, token),

  updateSettings: (updates: any, reason?: string, token?: string | null) =>
    adminFetch<any>(
      "/settings",
      { method: "PATCH", body: JSON.stringify({ updates, reason }) },
      token
    ),

  // ── Verification Management ──
  getVerificationPlans: (token?: string | null) =>
    adminFetch<{ plans: any[] }>("/verification/plans", {}, token),

  createVerificationPlan: (plan: any, token?: string | null) =>
    adminFetch<any>(
      "/verification/plans",
      { method: "POST", body: JSON.stringify(plan) },
      token
    ),

  updateVerificationPlan: (id: string, plan: any, token?: string | null) =>
    adminFetch<any>(
      `/verification/plans/${id}`,
      { method: "PUT", body: JSON.stringify(plan) },
      token
    ),

  deleteVerificationPlan: (id: string, token?: string | null) =>
    adminFetch<any>(
      `/verification/plans/${id}`,
      { method: "DELETE" },
      token
    ),

  getVerificationPaymentConfig: (token?: string | null) =>
    adminFetch<{ config: any }>("/verification/payment-config", {}, token),

  updateVerificationPaymentConfig: (config: any, token?: string | null) =>
    adminFetch<any>(
      "/verification/payment-config",
      { method: "PUT", body: JSON.stringify(config) },
      token
    ),

  getVerificationRequests: (params: Record<string, any> = {}, token?: string | null) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });
    return adminFetch<any>(`/verification/requests?${qs.toString()}`, {}, token);
  },

  getVerificationRequestDetails: (id: string, token?: string | null) =>
    adminFetch<any>(`/verification/requests/${id}`, {}, token),

  sendVerificationInstructions: (id: string, data: any = {}, token?: string | null) =>
    adminFetch<any>(
      `/verification/requests/${id}/send-instructions`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  approveVerificationRequest: (id: string, data: { notes?: string } = {}, token?: string | null) =>
    adminFetch<any>(
      `/verification/requests/${id}/approve`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  rejectVerificationRequest: (id: string, data: { reason?: string; notes?: string } = {}, token?: string | null) =>
    adminFetch<any>(
      `/verification/requests/${id}/reject`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  revokeUserVerification: (userId: string, data: { reason?: string } = {}, token?: string | null) =>
    adminFetch<any>(
      `/verification/users/${userId}/revoke`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  grantManualVerification: (userId: string, data: any, token?: string | null) =>
    adminFetch<any>(
      `/verification/users/${userId}/grant-manual`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  // ── Groups Management ──
  getGroups: (params: Record<string, any> = {}, token?: string | null) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });
    return adminFetch<any>(`/groups?${qs.toString()}`, {}, token);
  },

  getGroupDetails: (id: string, token?: string | null) =>
    adminFetch<any>(`/groups/${id}`, {}, token),

  disableGroup: (id: string, data: { reason?: string } = {}, token?: string | null) =>
    adminFetch<any>(
      `/groups/${id}/disable`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  restoreGroup: (id: string, token?: string | null) =>
    adminFetch<any>(
      `/groups/${id}/restore`,
      { method: "POST" },
      token
    ),

  deleteGroup: (id: string, token?: string | null) =>
    adminFetch<any>(
      `/groups/${id}`,
      { method: "DELETE" },
      token
    ),

  getAllGroupJoinRequests: (params: Record<string, any> = {}, token?: string | null) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });
    return adminFetch<any>(`/groups-all/join-requests?${qs.toString()}`, {}, token);
  },

  // ── Plans & Monetization Management ──
  getPlansOverview: (token?: string | null) =>
    adminFetch<any>("/plans/overview", {}, token),

  getPlansConfig: (token?: string | null) =>
    adminFetch<any>("/plans-config", {}, token),

  updatePlanConfig: (planId: string, data: any, token?: string | null) =>
    adminFetch<any>(
      `/plans-config/${planId}`,
      { method: "PUT", body: JSON.stringify(data) },
      token
    ),

  getSubscribers: (params: Record<string, any> = {}, token?: string | null) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });
    return adminFetch<any>(`/plans/subscribers?${qs.toString()}`, {}, token);
  },

  assignPlan: (
    data: {
      userId: string;
      planId: string;
      durationDays?: number;
      cycle?: string;
      reason?: string;
      notes?: string;
    },
    token?: string | null
  ) =>
    adminFetch<any>(
      "/plans/assign",
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  revokePlan: (
    data: { userId: string; reason?: string },
    token?: string | null
  ) =>
    adminFetch<any>(
      "/plans/revoke",
      { method: "POST", body: JSON.stringify(data) },
      token
    ),
};
