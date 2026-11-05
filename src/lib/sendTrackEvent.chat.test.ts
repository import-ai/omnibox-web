/** @jest-environment jsdom */
import FingerprintJS from '@fingerprintjs/fingerprintjs';

import { http } from '@/lib/request';

import { reportChatErrorDisplay } from './chatErrorTracking';

jest.mock('@fingerprintjs/fingerprintjs', () => ({
  __esModule: true,
  default: { load: jest.fn() },
}));
jest.mock('@/lib/request', () => ({ http: { post: jest.fn() } }));
const settle = async () => {
  for (let i = 0; i < 50; i++) await Promise.resolve();
};
const mockedPost = jest.mocked(http.post),
  mockedLoad = jest.mocked(FingerprintJS.load);
beforeEach(() => {
  jest.useFakeTimers();
  localStorage.setItem('uid', 'user-a');
  mockedPost.mockReset();
  mockedLoad.mockReset();
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

test('actual reporter/sender delivers the original offline display after reconnect even without fingerprinting', async () => {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: false,
  });
  mockedLoad.mockRejectedValue(new Error('fingerprinting blocked'));
  mockedPost
    .mockRejectedValueOnce(new Error('still offline'))
    .mockResolvedValue(undefined as never);
  reportChatErrorDisplay(' 原样\n红字 ', {
    conversationId: 'offline-c',
    messageId: 'offline-m',
    stage: 'display',
  });
  await settle();
  expect(mockedPost).not.toHaveBeenCalled();
  const stored = JSON.parse(
    sessionStorage.getItem('omnibox_chat_error_outbox')!
  );
  const occurredAt = stored[0].props.occurred_at;
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  });
  window.dispatchEvent(new Event('online'));
  await settle();
  expect(mockedPost).toHaveBeenCalledTimes(1);
  expect(
    JSON.parse(sessionStorage.getItem('omnibox_chat_error_outbox')!)
  ).toHaveLength(1);
  jest.advanceTimersByTime(10_000);
  await settle();
  expect(mockedPost).toHaveBeenCalledTimes(2);
  const event = (mockedPost.mock.calls[1][1] as any).events[0];
  expect(event.props).toMatchObject({
    display_message: ' 原样\n红字 ',
    user_id: 'user-a',
    occurred_at: occurredAt,
  });
  expect(mockedPost.mock.calls[1][2]).toMatchObject({
    mute: true,
    skipAuthRedirect: true,
  });
  expect(
    JSON.parse(sessionStorage.getItem('omnibox_chat_error_outbox')!)
  ).toEqual([]);
});

test('account changes during asynchronous fingerprinting cannot relabel or dispatch an old event', async () => {
  let resolve!: (value: any) => void;
  mockedLoad.mockImplementation(
    () =>
      new Promise(done => {
        resolve = done;
      })
  );
  mockedPost.mockResolvedValue(undefined as never);
  reportChatErrorDisplay('offline', {
    conversationId: 'account-c',
    messageId: 'account-m',
    stage: 'display',
  });
  await settle();
  localStorage.setItem('uid', 'user-b');
  resolve({ get: async () => ({ visitorId: 'visitor' }) });
  await settle();
  expect(mockedPost).not.toHaveBeenCalled();
  window.dispatchEvent(new Event('online'));
  await settle();
  expect(mockedPost).not.toHaveBeenCalled();
  localStorage.setItem('uid', 'user-a');
  window.dispatchEvent(new Event('online'));
  await settle();
  expect(mockedPost).toHaveBeenCalledTimes(1);
  const config = mockedPost.mock.calls[0][2]!;
  expect(config.traceScopeValid?.()).toBe(true);
  localStorage.setItem('uid', 'user-b');
  expect(config.traceScopeValid?.()).toBe(false);
});
