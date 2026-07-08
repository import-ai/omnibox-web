export function createStreamTransport(
  url: string,
  body: Record<string, any>,
  callback: (data: string) => Promise<void>,
  cancelUrl: string
) {
  let isAborted = false;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  return {
    start: async () => {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Request-Id': crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch from wizard');
      }
      reader = response.body?.getReader();
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
        try {
          await reader.cancel();
        } catch {
          // reader may already be closed by destroy/cancel.
        }
      }
    },
    destroy: () => {
      isAborted = true;
      void reader?.cancel();
    },
    cancel: async () => {
      const token = localStorage.getItem('token') || '';
      try {
        await fetch(cancelUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ conversation_id: body.conversation_id }),
        });
      } finally {
        isAborted = true;
        await reader?.cancel();
      }
    },
  };
}
