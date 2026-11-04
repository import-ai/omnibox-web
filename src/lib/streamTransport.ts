import { chatErrorDetails, isChatCancellation } from '@/lib/chatErrors';

function networkFailure(error: unknown, code: string) {
  if (isChatCancellation(error)) return error;
  const details = chatErrorDetails(error);
  return Object.assign(new Error(details.message || 'Network Error'), details, {
    code,
  });
}

export function createStreamTransport(
  url: string,
  body: Record<string, any>,
  callback: (data: string) => Promise<void>,
  cancelUrl: string,
  onOpen?: () => void
) {
  let isAborted = false;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let controller: AbortController | undefined;
  // Cursor of the last event delivered to the callback. A repeated event is
  // skipped so a resume replay cannot append the same delta twice.
  let lastEventId: string | undefined;
  const deliveredEventIds = new Set<string>();

  const eventIdOf = (data: string) => {
    try {
      const parsed: unknown = JSON.parse(data);
      if (parsed && typeof parsed === 'object' && 'event_id' in parsed) {
        const eventId = (parsed as { event_id?: unknown }).event_id;
        if (typeof eventId === 'string' && eventId) return eventId;
      }
    } catch {
      // Not every SSE payload is JSON; leave it without a cursor.
    }
    return undefined;
  };

  const deliver = async (data: string) => {
    const eventId = eventIdOf(data);
    if (eventId && deliveredEventIds.has(eventId)) return;
    await callback(data);
    if (eventId) {
      deliveredEventIds.add(eventId);
      lastEventId = eventId;
    }
  };

  return {
    start: async () => {
      try {
        if (isAborted) return;
        const token = localStorage.getItem('token') || '';
        controller = new AbortController();
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Client-Platform': 'web',
            'X-Timezone':
              Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        }).catch(error => {
          throw networkFailure(error, 'STREAM_CONNECTION_FAILED');
        });
        if (!response.ok) {
          let payload: unknown;
          try {
            payload = await response.json();
          } catch {
            // Keep a safe transport fallback for non-JSON responses.
          }
          const details = chatErrorDetails(payload);
          throw Object.assign(
            new Error(details.message || 'Failed to fetch from wizard'),
            details,
            { status: response.status }
          );
        }
        reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }
        onOpen?.();
        const decoder = new TextDecoder();
        let buffer: string = '';

        try {
          while (!isAborted) {
            const { done, value } = await reader.read().catch(error => {
              throw networkFailure(error, 'STREAM_READ_FAILED');
            });
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            while (!isAborted) {
              const lineEnd = buffer.indexOf('\n');
              if (lineEnd == -1) break;

              const line = buffer.slice(0, lineEnd).trim();
              buffer = buffer.slice(lineEnd + 1);

              if (line.startsWith('data:')) {
                const data = line.slice(5).trim();
                await deliver(data);
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
      } catch (error) {
        if (!isAborted) throw error;
      }
    },
    destroy: () => {
      isAborted = true;
      controller?.abort();
      void reader?.cancel().catch(() => undefined);
    },
    getLastEventId: () => lastEventId,
    cancel: async () => {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(cancelUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Platform': 'web',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversation_id: body.conversation_id }),
      });
      if (!response.ok)
        throw new Error(`Stream cancel failed: ${response.status}`);
      isAborted = true;
      controller?.abort();
      try {
        await reader?.cancel();
      } catch {
        /* The server already accepted cancellation. */
      }
    },
  };
}
