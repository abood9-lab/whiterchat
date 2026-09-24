import { MobileStorage } from "../storage";
import type { User, Post, Story, Comment, AuthSession } from "../../types";

const API_BASE = "/api";

class ApiClient {
  private async getAuthToken(): Promise<string | null> {
    return await MobileStorage.getItem("whiterchat_mobile_token");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string; status: number }> {
    try {
      const token = await this.getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const contentType = response.headers.get("content-type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        return {
          error: data?.message || data?.error || `Request failed with status ${response.status}`,
          status: response.status,
        };
      }

      return { data, status: response.status };
    } catch (err: any) {
      return {
        error: err.message || "Network request failed. Please check your connection.",
        status: 0,
      };
    }
  }

  // ── Authentication ────────────────────────────────────────────────────────
  async register(params: {
    username: string;
    email: string;
    password: string;
    displayName: string;
  }) {
    return this.request<{ user: User; token: string; requiresVerification?: boolean; email?: string }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify(params),
      }
    );
  }

  async login(params: { login: string; password?: string; code?: string }) {
    return this.request<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async verifyOtp(params: { email: string; code: string }) {
    return this.request<{ success: boolean; user: User; token: string; message?: string }>(
      "/auth/verify-otp",
      {
        method: "POST",
        body: JSON.stringify(params),
      }
    );
  }

  async resendOtp(params: { email: string; type?: "register" | "reset" }) {
    return this.request<{ success: boolean; message: string }>("/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async forgotPassword(params: { email: string }) {
    return this.request<{ success: boolean; message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async resetPassword(params: { email: string; code: string; newPassword: string }) {
    return this.request<{ success: boolean; message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getCurrentUser() {
    return this.request<{ user: User }>("/auth/me");
  }

  // ── Posts & Feed ──────────────────────────────────────────────────────────
  async getFeed(params: { page?: number; limit?: number } = {}) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    return this.request<{ posts: Post[]; hasMore: boolean }>(
      `/posts/feed?page=${page}&limit=${limit}`
    );
  }

  async getExplorePosts(params: { page?: number; limit?: number } = {}) {
    const page = params.page || 1;
    const limit = params.limit || 15;
    return this.request<{ posts: Post[] }>(`/posts/explore?page=${page}&limit=${limit}`);
  }

  async likePost(postId: string) {
    return this.request<{ liked: boolean; likesCount: number }>(`/posts/${postId}/like`, {
      method: "POST",
    });
  }

  async savePost(postId: string) {
    return this.request<{ saved: boolean }>(`/posts/${postId}/save`, {
      method: "POST",
    });
  }

  async getPostComments(postId: string) {
    return this.request<{ comments: Comment[] }>(`/posts/${postId}/comments`);
  }

  async addComment(postId: string, content: string) {
    return this.request<{ comment: Comment }>(`/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  async createPost(params: { caption: string; mediaUrls: string[]; mediaType?: string }) {
    return this.request<{ post: Post }>("/posts", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  // ── Stories ───────────────────────────────────────────────────────────────
  async getStoriesFeed() {
    return this.request<{ stories: Story[] }>("/stories/feed");
  }

  async createStory(params: { mediaUrl: string; mediaType?: string; caption?: string }) {
    return this.request<{ story: Story }>("/stories", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  // ── User Profiles ─────────────────────────────────────────────────────────
  async getUserProfile(username: string) {
    return this.request<{ user: User; isFollowing?: boolean; posts?: Post[] }>(
      `/users/${encodeURIComponent(username)}`
    );
  }

  async getUserPosts(userId: string) {
    return this.request<{ posts: Post[] }>(`/users/${userId}/posts`);
  }

  async followUser(userId: string) {
    return this.request<{ following: boolean }>(`/users/${userId}/follow`, {
      method: "POST",
    });
  }

  async updateProfile(params: Partial<User>) {
    return this.request<{ user: User }>("/users/profile", {
      method: "PATCH",
      body: JSON.stringify(params),
    });
  }
}

export const mobileApi = new ApiClient();
