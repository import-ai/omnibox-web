/** @jest-environment jsdom */
import { http } from '@/lib/request';
import { track } from '@/lib/sendTrackEvent';

let mockFingerprintFails = false;
jest.mock('@fingerprintjs/fingerprintjs', () => ({
  load: async () => ({
    get: async () => {
      if (mockFingerprintFails) throw new Error('fingerprint unavailable');
      return { visitorId: 'anonymous-browser' };
    },
  }),
}));
jest.mock('@/lib/request', () => ({ http: { post: jest.fn(async () => {}) } }));
const post = jest.mocked(http.post);
beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue(undefined);
  mockFingerprintFails = false;
});
test('retries with the identical exposure ID, time and event payload', async () => {
  post.mockRejectedValueOnce(new Error('network'));
  const props = {
    page_view_id: 'visit-1',
    occurred_at: '2026-11-09T02:00:00Z',
    schema_version: 1,
    platform: 'web',
  };
  await track('login_page_view', props);
  expect(post).toHaveBeenCalledTimes(2);
  expect(post.mock.calls[0]).toEqual(post.mock.calls[1]);
  expect(post.mock.calls[0]).toEqual([
    '/trace',
    {
      events: [
        {
          name: 'login_page_view',
          props: { ...props, finger: 'anonymous-browser' },
        },
      ],
    },
    { mute: true, skipAuthRedirect: true, timeout: 10000 },
  ]);
});
test('still delivers exposure when fingerprinting is blocked, without inventing a visitor', async () => {
  mockFingerprintFails = true;
  await track('registration_page_view', { page_view_id: 'visit-2' });
  expect(post).toHaveBeenCalledTimes(1);
  expect(post.mock.calls[0][1]).toEqual({
    events: [
      {
        name: 'registration_page_view',
        props: { page_view_id: 'visit-2', finger: undefined },
      },
    ],
  });
});
test('stops after two failed attempts', async () => {
  post.mockRejectedValue(new Error('offline'));
  await expect(
    track('login_page_view', { page_view_id: 'visit-3' })
  ).rejects.toThrow('offline');
  expect(post).toHaveBeenCalledTimes(2);
});
