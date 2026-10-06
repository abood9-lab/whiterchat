/**
 * WhiterChat Mobile Conversations & Messaging API
 */
import { apiClient } from './client';

export interface MobileConversation {
  id: string;
  isGroup?: boolean;
  groupName?: string;
  otherUser?: {
    id: string;
    username: string;
    avatarUrl?: string;
    fullName?: string;
  };
  lastMessage?: {
    text?: string;
    createdAt?: string;
  };
  unreadCount?: number;
}

export interface MobileMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  createdAt: string;
}

export async function fetchConversations(): Promise<MobileConversation[]> {
  const data = await apiClient<any>('/api/conversations');
  return Array.isArray(data) ? data : data.conversations || [];
}

export async function fetchMessages(conversationId: string): Promise<MobileMessage[]> {
  const data = await apiClient<any>(`/api/conversations/${conversationId}/messages`);
  return Array.isArray(data) ? data : data.messages || [];
}

export async function sendMessage(conversationId: string, payload: { text?: string; mediaUrl?: string; mediaType?: string }): Promise<MobileMessage> {
  return apiClient(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: payload,
  });
}
