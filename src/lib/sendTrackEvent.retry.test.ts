import FingerprintJS from '@fingerprintjs/fingerprintjs';

import { http } from '@/lib/request';

import { track } from './sendTrackEvent';

jest.mock('@fingerprintjs/fingerprintjs', () => ({
  __esModule: true,
  default: {
    load: jest.fn(),
  },
}));

jest.mock('@/lib/request', () => ({
  http: {
    post: jest.fn(() => Promise.resolve()),
  },
}));

const mockedLoad = jest.mocked(FingerprintJS.load);
const mockedPost = jest.mocked(http.post);

test('retries fingerprint loading after a failed attempt', async () => {
  mockedLoad
    .mockRejectedValueOnce(new Error('fingerprint blocked'))
    .mockResolvedValue({
      get: async () => ({ visitorId: 'visitor' }),
    } as unknown as Awaited<ReturnType<typeof FingerprintJS.load>>);

  await expect(track('first_event')).rejects.toThrow('fingerprint blocked');
  await track('second_event');

  expect(mockedLoad).toHaveBeenCalledTimes(2);
  expect(mockedPost).toHaveBeenCalledTimes(1);
  expect(mockedPost).toHaveBeenCalledWith(
    '/trace',
    expect.objectContaining({
      events: [
        expect.objectContaining({
          name: 'second_event',
          props: expect.objectContaining({ finger: 'visitor' }),
        }),
      ],
    }),
    { mute: true }
  );
});
