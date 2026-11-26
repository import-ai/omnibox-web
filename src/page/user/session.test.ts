/** @jest-environment jsdom */

import { http } from '@/lib/request';

import { establishServerSession, readSessionUser } from './session';

jest.mock('@/const', () => ({ API_BASE_URL: '/api/v1' }));
jest.mock('@/lib/request', () => ({
  http: { post: jest.fn() },
}));

const mockPost = http.post as jest.Mock;

describe('readSessionUser', () => {
  const originalFetch = globalThis.fetch;
  const fetchAccount = jest.fn();
  const { signal } = new AbortController();

  beforeEach(() => {
    localStorage.clear();
    fetchAccount.mockReset();
    globalThis.fetch = fetchAccount;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('reads the verified account with the browser cookie only', async () => {
    localStorage.setItem('token', 'stored-token');
    fetchAccount.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'verified-user' }),
    });

    await expect(readSessionUser(signal)).resolves.toBe('verified-user');
    expect(fetchAccount).toHaveBeenCalledWith('/api/v1/user/me', {
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
    });
  });

  it('ignores an incomplete local account when the backend returns 401', async () => {
    localStorage.setItem('uid', 'stale-user');
    fetchAccount.mockResolvedValue({ ok: false, status: 401 });

    await expect(readSessionUser(signal)).resolves.toBeNull();
    expect(localStorage.getItem('uid')).toBe('stale-user');
  });

  it('does not recognize a success response without an account id', async () => {
    fetchAccount.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await expect(readSessionUser(signal)).resolves.toBeNull();
  });
});

describe('establishServerSession', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('exchanges the stored token for a session cookie', async () => {
    mockPost.mockResolvedValue({ uid: 'user-1' });

    await expect(establishServerSession()).resolves.toBe('user-1');

    expect(mockPost).toHaveBeenCalledWith('auth/session', undefined, {
      mute: true,
      skipAuthRedirect: true,
      signal: undefined,
    });
  });

  it('forwards the abort signal to the request', async () => {
    mockPost.mockResolvedValue({ uid: 'user-1' });
    const controller = new AbortController();

    await establishServerSession(controller.signal);

    expect(mockPost).toHaveBeenCalledWith(
      'auth/session',
      undefined,
      expect.objectContaining({ signal: controller.signal })
    );
  });

  it('propagates failures so callers can pick a fallback', async () => {
    mockPost.mockRejectedValue(new Error('session exchange failed'));

    await expect(establishServerSession()).rejects.toThrow(
      'session exchange failed'
    );
  });
});
