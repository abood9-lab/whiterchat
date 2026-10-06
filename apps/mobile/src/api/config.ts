/**
 * WhiterChat Mobile API Configuration
 */
import { AsyncStorage } from 'react-native';

// In development, default to localhost or relative URL, or environment setting
export const API_BASE_URL = process.env.WHITERCHAT_API_URL || 'https://ais-dev-vzqxlhhf43r3pkg3ezgw6p-885868645465.europe-west2.run.app';
export const SOCKET_BASE_URL = process.env.WHITERCHAT_SOCKET_URL || 'https://ais-dev-vzqxlhhf43r3pkg3ezgw6p-885868645465.europe-west2.run.app';

export const TOKEN_STORAGE_KEY = 'whiterchat_mobile_token';
export const USER_STORAGE_KEY = 'whiterchat_mobile_user';

export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore
  }
}

export async function removeAuthToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // ignore
  }
}
