/**
 * WhiterChat Central Mobile Socket.IO Manager
 */
import { SOCKET_BASE_URL, getAuthToken } from './config';

class MobileSocketManager {
  private socket: any = null;
  private isConnecting = false;

  public async connect(): Promise<any> {
    if (this.socket) return this.socket;
    if (this.isConnecting) return null;

    this.isConnecting = true;
    try {
      const token = await getAuthToken();
      if (!token) {
        this.isConnecting = false;
        return null;
      }

      // Dynamic import or socket.io-client
      const io = require('socket.io-client');
      this.socket = io(SOCKET_BASE_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });

      this.socket.on('connect', () => {
        console.log('[MobileSocket] Connected:', this.socket.id);
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log('[MobileSocket] Disconnected:', reason);
      });

      this.isConnecting = false;
      return this.socket;
    } catch (err) {
      console.error('[MobileSocket] Connection error:', err);
      this.isConnecting = false;
      return null;
    }
  }

  public getSocket(): any {
    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const mobileSocket = new MobileSocketManager();
