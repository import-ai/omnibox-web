import { http } from '@/lib/request';

import { track } from './sendTrackEvent';

jest.mock('@fingerprintjs/fingerprintjs', () => ({
  load: async () => ({
    get: async () => ({ visitorId: 'visitor' }),
  }),
}));

jest.mock('@/lib/request', () => ({
  http: {
    post: jest.fn(() => Promise.resolve()),
  },
}));

const mockedPost = jest.mocked(http.post);

test('trace failures stay silent', async () => {
  await track('invite_referral_page_view', { platform: 'web' });

  expect(mockedPost).toHaveBeenCalledWith(
    '/trace',
    {
      events: [
        {
          name: 'invite_referral_page_view',
          props: {
            finger: 'visitor',
            platform: 'web',
          },
        },
      ],
    },
    { mute: true }
  );
});
