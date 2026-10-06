/**
 * WhiterChat Mobile Stories & Notifications API
 */
import { apiClient } from './client';

export async function fetchStoriesFeed(): Promise<any[]> {
  const data = await apiClient<any>('/api/stories/feed');
  return Array.isArray(data) ? data : data.stories || [];
}

export async function fetchNotifications(): Promise<any[]> {
  const data = await apiClient<any>('/api/notifications');
  return Array.isArray(data) ? data : data.notifications || [];
}
