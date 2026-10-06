/**
 * WhiterChat Mobile Posts & Feed API
 */
import { apiClient } from './client';

export interface MobilePost {
  id: string;
  author: {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl?: string;
  };
  caption?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  mediaUrls?: string[];
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  createdAt: string;
}

export async function fetchFeed(page = 1, limit = 15): Promise<MobilePost[]> {
  const data = await apiClient<any>(`/api/posts/feed?page=${page}&limit=${limit}`);
  return Array.isArray(data) ? data : data.posts || [];
}

export async function fetchPostDetail(postId: string): Promise<MobilePost> {
  return apiClient<MobilePost>(`/api/posts/${postId}`);
}

export async function likePost(postId: string): Promise<{ isLiked: boolean; likesCount: number }> {
  return apiClient(`/api/posts/${postId}/like`, { method: 'POST' });
}

export async function savePost(postId: string): Promise<{ isSaved: boolean }> {
  return apiClient(`/api/posts/${postId}/save`, { method: 'POST' });
}

export async function fetchComments(postId: string): Promise<any[]> {
  const data = await apiClient<any>(`/api/posts/${postId}/comments`);
  return Array.isArray(data) ? data : data.comments || [];
}

export async function addComment(postId: string, text: string): Promise<any> {
  return apiClient(`/api/posts/${postId}/comments`, {
    method: 'POST',
    body: { text },
  });
}

export async function createPost(payload: { caption?: string; mediaUrl?: string; mediaType?: 'image' | 'video' }): Promise<MobilePost> {
  return apiClient('/api/posts', {
    method: 'POST',
    body: payload,
  });
}
