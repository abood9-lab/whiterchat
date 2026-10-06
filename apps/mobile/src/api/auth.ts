/**
 * WhiterChat Mobile Authentication API
 */
import { apiClient } from './client';
import { setAuthToken, removeAuthToken, AsyncStorage, USER_STORAGE_KEY } from './config';

export interface MobileUser {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isVerified?: boolean;
}

export async function loginUser(emailOrUsername: string, password?: string) {
  const data = await apiClient<{ token: string; user: MobileUser }>('/api/auth/login', {
    method: 'POST',
    body: { login: emailOrUsername, username: emailOrUsername, password },
  });

  if (data.token) {
    await setAuthToken(data.token);
    if (data.user) {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
    }
  }
  return data;
}

export async function registerUser(payload: { username: string; email: string; fullName?: string; password?: string }) {
  const data = await apiClient<{ token: string; user: MobileUser }>('/api/auth/register', {
    method: 'POST',
    body: payload,
  });

  if (data.token) {
    await setAuthToken(data.token);
    if (data.user) {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
    }
  }
  return data;
}

export async function getCurrentUser(): Promise<MobileUser | null> {
  try {
    const data = await apiClient<{ user: MobileUser }>('/api/auth/me');
    if (data?.user) {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      return data.user;
    }
    return null;
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  await removeAuthToken();
}
