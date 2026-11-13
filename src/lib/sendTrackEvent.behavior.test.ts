/** @jest-environment jsdom */
import FingerprintJS from '@fingerprintjs/fingerprintjs';

import { http } from '@/lib/request';

import { track } from './sendTrackEvent';
jest.mock('@fingerprintjs/fingerprintjs', () => ({
  __esModule: true,
  default: { load: jest.fn() },
}));
jest.mock('@/lib/request', () => ({ http: { post: jest.fn() } }));
const settle = async () => {
  for (let i = 0; i < 60; i++) await Promise.resolve();
};
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});
it('keeps original ISO event time/IDs in offline behavior delivery and retries only trace', async () => {
  jest.useFakeTimers();
  localStorage.setItem('uid', 'user');
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: false,
  });
  jest.mocked(FingerprintJS.load).mockRejectedValue(new Error('blocked'));
  jest
    .mocked(http.post)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue(undefined as never);
  const props = {
    schema_version: 1,
    event_id: 'a838671d-705b-4e08-b783-4daa4fab4d29',
    occurred_at: '2026-11-10T15:59:59.000Z',
    target: 'settings',
  };
  await track('ui_exposure', props);
  await settle();
  expect(http.post).not.toHaveBeenCalled();
  expect(
    JSON.parse(localStorage.getItem('omnibox_behavior_outbox')!)[0].props
      .occurred_at
  ).toBe(props.occurred_at);
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  });
  window.dispatchEvent(new Event('online'));
  await settle();
  jest.advanceTimersByTime(10_000);
  await settle();
  expect(http.post).toHaveBeenCalledTimes(2);
  expect(jest.mocked(http.post).mock.calls[0][0]).toBe('/trace');
  expect(jest.mocked(http.post).mock.calls[1][1]).toEqual(
    jest.mocked(http.post).mock.calls[0][1]
  );
  expect(jest.mocked(http.post).mock.calls[1][1]).toMatchObject({
    events: [{ name: 'ui_exposure', props }],
  });
});
