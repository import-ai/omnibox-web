import { createStreamTransport } from './streamTransport';

const localValues = new Map<string, string>();
const localStorageMock: Storage = {
  get length() {
    return localValues.size;
  },
  clear: () => localValues.clear(),
  getItem: key => localValues.get(key) ?? null,
  key: index => Array.from(localValues.keys())[index] ?? null,
  removeItem: key => localValues.delete(key),
  setItem: (key, value) => localValues.set(key, value),
};
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: localStorageMock,
});

function streamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status: 200 });
}

async function deliveredFrom(chunks: string[]): Promise<string[]> {
  const fetchMock = jest.fn().mockResolvedValue(streamResponse(chunks));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  const delivered: string[] = [];
  const transport = createStreamTransport(
    'http://wizard/ask',
    { conversation_id: 'conv' },
    async data => {
      delivered.push(data);
    },
    'http://wizard/stop'
  );
  await transport.start();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  return delivered;
}

describe('createStreamTransport', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'test-token');
  });

  it('delivers data lines in order', async () => {
    const delivered = await deliveredFrom([
      'data: {"response_type":"bos"}\n\n',
      'data: {"response_type":"delta","delta":"hi"}\n\ndata: {"response_type":"eos"}\n\n',
    ]);
    expect(delivered).toEqual([
      '{"response_type":"bos"}',
      '{"response_type":"delta","delta":"hi"}',
      '{"response_type":"eos"}',
    ]);
  });

  it('delivers the ping heartbeat like any other data line', async () => {
    const delivered = await deliveredFrom([
      'data: {"response_type":"bos"}\n\n',
      'id: 3\ndata: {"response_type":"ping"}\n\n',
      'data: {"response_type":"done"}\n\n',
    ]);
    expect(delivered).toEqual([
      '{"response_type":"bos"}',
      '{"response_type":"ping"}',
      '{"response_type":"done"}',
    ]);
  });

  it('reassembles an event split across chunks', async () => {
    const delivered = await deliveredFrom([
      'data: {"response_type":"del',
      'ta","delta":"split"}\n',
      '\ndata: {"response_type":"eos"}\n\n',
    ]);
    expect(delivered).toEqual([
      '{"response_type":"delta","delta":"split"}',
      '{"response_type":"eos"}',
    ]);
  });

  it('ignores comment, id and retry lines', async () => {
    const delivered = await deliveredFrom([
      ': ping\n\n',
      'id: 1\nretry: 3000\ndata: {"response_type":"bos"}\n\n',
      ': keep-alive\nid: 2\n\n',
      'data: {"response_type":"eos"}\n\n',
    ]);
    expect(delivered).toEqual([
      '{"response_type":"bos"}',
      '{"response_type":"eos"}',
    ]);
  });

  it('sends the bearer token and client platform headers', async () => {
    const fetchMock = jest.fn().mockResolvedValue(streamResponse([]));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const transport = createStreamTransport(
      'http://wizard/ask',
      { conversation_id: 'conv' },
      async () => {},
      'http://wizard/stop'
    );
    await transport.start();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer test-token',
      'X-Client-Platform': 'web',
    });
    expect(init.body).toBe('{"conversation_id":"conv"}');
  });
});

it('keeps the HTTP status and business code of a rejected chat request', async () => {
  globalThis.fetch = jest.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        code: 'CONVERSATION_BUSY',
        message: 'still generating',
      }),
      { status: 409 }
    )
  );
  const transport = createStreamTransport(
    '/ask',
    {},
    async () => {},
    '/cancel'
  );
  await expect(transport.start()).rejects.toMatchObject({
    code: 'CONVERSATION_BUSY',
    status: 409,
    message: 'still generating',
  });
});

it('does not report a read failure after the view detaches', async () => {
  let rejectRead!: (error: Error) => void;
  let didRead!: () => void;
  const reading = new Promise<void>(resolve => {
    didRead = resolve;
  });
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: true,
    body: {
      getReader: () => ({
        read: () => {
          didRead();
          return new Promise((_, reject) => {
            rejectRead = reject;
          });
        },
        cancel: async () => {},
      }),
    },
  });
  const transport = createStreamTransport(
    '/ask',
    {},
    async () => {},
    '/cancel'
  );
  const started = transport.start();
  await reading;
  transport.destroy();
  rejectRead(new TypeError('network lost'));
  await expect(started).resolves.toBeUndefined();
});

it.each(['connect', 'read'])(
  'retains transport phase for an unfamiliar %s failure',
  async phase => {
    const error = new TypeError('browser-specific network failure');
    globalThis.fetch =
      phase === 'connect'
        ? jest.fn().mockRejectedValue(error)
        : jest.fn().mockResolvedValue({
            ok: true,
            body: {
              getReader: () => ({
                read: () => Promise.reject(error),
                cancel: async () => {},
              }),
            },
          });
    const transport = createStreamTransport(
      '/ask',
      {},
      async () => {},
      '/cancel'
    );
    await expect(transport.start()).rejects.toMatchObject({
      code:
        phase === 'connect' ? 'STREAM_CONNECTION_FAILED' : 'STREAM_READ_FAILED',
    });
  }
);
