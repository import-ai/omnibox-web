import { http } from '@/lib/request';

import { establishServerSession } from './session';

jest.mock('@/lib/request', () => ({
  http: { post: jest.fn() },
}));

const mockPost = http.post as jest.Mock;

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
