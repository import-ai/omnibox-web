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
    mockPost.mockResolvedValue(undefined);

    await establishServerSession();

    expect(mockPost).toHaveBeenCalledWith('auth/session', undefined, {
      mute: true,
    });
  });

  it('propagates failures so callers can pick a fallback', async () => {
    mockPost.mockRejectedValue(new Error('session exchange failed'));

    await expect(establishServerSession()).rejects.toThrow(
      'session exchange failed'
    );
  });
});
