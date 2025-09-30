import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getWebSocketConnection(): Socket {
  const token = localStorage.getItem('token') || '';

  // If socket exists but token changed, disconnect and recreate
  if (socket) {
    const currentAuth = (socket.auth as any)?.token;
    if (currentAuth !== `Bearer ${token}`) {
      socket.disconnect();
      socket = null;
    } else if (socket.connected) {
      return socket;
    }
  }

  const apiBaseUrl = window.location.origin;

  socket = io(`${apiBaseUrl}/wizard`, {
    transports: ['websocket', 'polling'],
    auth: {
      token: `Bearer ${token}`,
    },
    extraHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('WebSocket connected:', socket?.id);
  });

  socket.on('disconnect', reason => {
    console.log('WebSocket disconnected:', reason);
  });

  socket.on('connect_error', error => {
    console.error('WebSocket connect_error:', error);
  });

  socket.on('error', error => {
    console.error('WebSocket error:', error);
  });

  socket.on('exception', exception => {
    console.error('WebSocket exception:', exception);
  });

  return socket;
}

export function disconnectWebSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
