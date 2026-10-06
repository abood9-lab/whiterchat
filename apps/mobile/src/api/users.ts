/**
 * WhiterChat Mobile Profiles & Users API
 */
import { apiClient } from './client';

export interface UserProfileData {
  id: string;
  username: string;
  fullName?: string;
  bio?: string;
  avatarUrl?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing?: boolean;
  isVerified?: boolean;
  posts?: any[];
}

export async function fetchUserProfile(username: string): Promise<UserProfileData> {
  const data = await apiClient<any>(`/api/users/profile/${username}`);
  return data.profile || data;
}

export async function followUser(userId: string): Promise<{ isFollowing: boolean }> {
  return apiClient(`/api/users/${userId}/follow`, { method: 'POST' });
}

export async function unfollowUser(userId: string): Promise<{ isFollowing: boolean }> {
  return apiClient(`/api/users/${userId}/unfollow`, { method: 'POST' });
}

export async function searchUsers(query: string): Promise<any[]> {
  const data = await apiClient<any>(`/api/users/search?q=${encodeURIComponent(query)}`);
  return Array.isArray(data) ? data : data.users || [];
}
