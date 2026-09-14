/** @jest-environment jsdom */

import { TextDecoder, TextEncoder } from 'node:util';

import { http } from './request';
import { createStreamTransport } from './streamTransport';

jest.mock('@/const', () => ({ API_BASE_URL: '/api/v1' }));
jest.mock('@/page/user/util', () => ({ removeGlobalCredential: jest.fn() }));
jest.mock('lodash-es', () => ({
  isUndefined: (value: unknown) => value === undefined,
}));

describe('Web client identification', () => {
  beforeEach(() => localStorage.clear());

  it('marks history requests, including unauthenticated shared conversations', async () => {
    for (const url of [
      '/namespaces/ns/conversations/chat',
      '/shares/share/conversations/chat',
    ]) {
      const adapter = jest.fn(async config => ({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }));
      await http.get(url, { adapter });
      expect(adapter.mock.calls[0][0].headers.get('X-Client-Platform')).toBe(
        'web'
      );
    }
  });

  it.each(['', 'test-token'])(
    'marks stream, resume and cancel requests with token=%s',
    async token => {
      if (token) localStorage.setItem('token', token);
      Object.defineProperty(globalThis, 'TextDecoder', {
        configurable: true,
        value: TextDecoder,
      });
      const fetchMock = jest.fn();
      Object.defineProperty(globalThis, 'fetch', {
        configurable: true,
        value: fetchMock,
      });
      for (const url of [
        '/api/v1/namespaces/ns/wizard/ask',
        '/api/v1/shares/share/wizard/stream/resume',
      ]) {
        const reader = {
          read: jest
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: {"response_type":"done"}\n\n'
              ),
            })
            .mockResolvedValue({ done: true }),
          cancel: jest.fn(),
        };
        fetchMock.mockResolvedValue({
          ok: true,
          body: { getReader: () => reader },
        });
        const callback = jest.fn().mockResolvedValue(undefined);
        const transport = createStreamTransport(
          url,
          { conversation_id: 'chat' },
          callback,
          '/cancel'
        );
        await transport.start();
        await transport.cancel();
        expect(callback).toHaveBeenCalledWith('{"response_type":"done"}');
      }
      expect(fetchMock).toHaveBeenCalledTimes(4);
      for (const [, init] of fetchMock.mock.calls) {
        expect(init.headers['X-Client-Platform']).toBe('web');
        expect(init.headers.Authorization).toBe(`Bearer ${token}`);
      }
    }
  );
});
