import { getWebSocketConnection } from './websocket';

export interface StreamTransport {
  start: () => Promise<void>;
  destroy: () => void;
}

type StreamCallback = (data: string) => Promise<void>;

function createSSETransport(
  url: string,
  body: Record<string, any>,
  callback: StreamCallback
): StreamTransport {
  let isAborted = false;

  return {
    start: async () => {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch from wizard');
      }
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      const decoder = new TextDecoder();
      let buffer: string = '';

      try {
        while (!isAborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          while (!isAborted) {
            const lineEnd = buffer.indexOf('\n');
            if (lineEnd == -1) break;

            const line = buffer.slice(0, lineEnd).trim();
            buffer = buffer.slice(lineEnd + 1);

            if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              await callback(data);
            }
          }
        }
      } finally {
        await reader.cancel();
      }
    },
    destroy: () => {
      isAborted = true;
    },
  };
}

function createWebSocketTransport(
  event: string,
  body: Record<string, any>,
  callback: StreamCallback
): StreamTransport {
  const socket = getWebSocketConnection();
  let isAborted = false;

  const messageHandler = async (data: string) => {
    if (!isAborted) {
      await callback(data);
    }
  };

  const errorHandler = (error: { error: string }) => {
    console.error('WebSocket error:', error);
  };

  const completeHandler = () => {
    cleanup();
  };

  const cleanup = () => {
    socket.off('message', messageHandler);
    socket.off('error', errorHandler);
    socket.off('complete', completeHandler);
  };

  return {
    start: async () => {
      socket.on('message', messageHandler);
      socket.on('error', errorHandler);
      socket.on('complete', completeHandler);

      socket.emit(event, body);
    },
    destroy: () => {
      isAborted = true;
      cleanup();
    },
  };
}

export function createStreamTransport(
  url: string,
  body: Record<string, any>,
  callback: StreamCallback
): StreamTransport {
  const useWebSocket =
    import.meta.env.VITE_USE_WEBSOCKET?.toLowerCase() !== 'false';

  if (useWebSocket) {
    const event = url.includes('/ask') ? 'ask' : 'write';
    return createWebSocketTransport(event, body, callback);
  }

  return createSSETransport(url, body, callback);
}
