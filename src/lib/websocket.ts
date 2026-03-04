import { io, Socket } from 'socket.io-client';

let globalSocket: Socket | null = null;

/**
 * @deprecated Use socket.io-client directly or hooks from @omnibox/react-common
 */
export function getWebSocketConnection(): Socket {
  const token = localStorage.getItem('token') || '';

  // If socket exists but token changed, disconnect and recreate
  if (globalSocket) {
    const currentAuth = (globalSocket.auth as any)?.token;
    if (currentAuth !== `Bearer ${token}`) {
      globalSocket.disconnect();
      globalSocket = null;
    } else if (globalSocket.connected) {
      return globalSocket;
    }
  }

  const apiBaseUrl = window.location.origin;

  globalSocket = io(`${apiBaseUrl}/wizard`, {
    path: '/api/v1/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token: `Bearer ${token}` },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return globalSocket;
}

/**
 * @deprecated Use socket.io-client directly or hooks from @omnibox/react-common
 */
export function disconnectWebSocket(): void {
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }
}
