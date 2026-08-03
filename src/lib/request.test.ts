/** @jest-environment jsdom */

import { AxiosHeaders } from 'axios';

import request, { RequestConfig } from './request';

jest.mock('lodash-es', () => ({
  isUndefined: (value: unknown) => value === undefined,
}));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('@/const', () => ({ API_BASE_URL: '/api/v1' }));
jest.mock('@/page/user/util', () => ({
  removeGlobalCredential: () => {
    localStorage.removeItem('uid');
    localStorage.removeItem('token');
  },
}));

type RejectedHandler = (error: unknown) => Promise<unknown>;

function getResponseErrorHandler(): RejectedHandler {
  const interceptors = request.interceptors.response as unknown as {
    handlers: Array<{ rejected: RejectedHandler }>;
  };
  return interceptors.handlers[0].rejected;
}

describe('request token recovery', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('retries an expired-token request once without authorization', async () => {
    localStorage.setItem('uid', 'user-1');
    localStorage.setItem('token', 'expired-token');
    const adapter = jest.fn(async (config: RequestConfig) => ({
      config,
      data: { id: 'share-1' },
      headers: new AxiosHeaders(),
      status: 200,
      statusText: 'OK',
    }));
    const config: RequestConfig = {
      adapter,
      headers: new AxiosHeaders({ Authorization: 'Bearer expired-token' }),
      method: 'get',
      mute: true,
      retryWithoutAuth: true,
      url: '/shares/share-1',
    };

    const result = await getResponseErrorHandler()({
      config,
      response: { data: { code: 'token_expired' }, status: 401 },
      status: 401,
    });

    expect(result).toEqual({ id: 'share-1' });
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(
      adapter.mock.calls[0][0].headers?.get('Authorization')
    ).toBeUndefined();
    expect(localStorage.getItem('token')).toBeNull();
    expect(config.retryWithoutAuth).toBe(false);
  });
});
