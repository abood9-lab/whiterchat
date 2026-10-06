/**
 * WhiterChat Central Mobile API Client
 */
import { API_BASE_URL, getAuthToken } from './config';

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

export async function apiClient<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const config: RequestInit = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
      config.body = options.body;
    } else {
      config.body = JSON.stringify(options.body);
    }
  }

  try {
    const response = await fetch(url, config);

    if (response.status === 401) {
      // Session expired
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data as T;
  } catch (err: any) {
    throw err;
  }
}
