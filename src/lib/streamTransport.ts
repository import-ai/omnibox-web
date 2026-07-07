export interface StreamTransport {
  start: () => Promise<void>;
  destroy: () => void;
}

type StreamCallback = (data: string) => Promise<void>;

export function createStreamTransport(
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
