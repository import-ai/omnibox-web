import type FingerprintJS from '@fingerprintjs/fingerprintjs';

const mockLoad = jest.fn();
const mockPost = jest.fn<
  Promise<void>,
  [
    string,
    { events: { name: string; props: Record<string, string | undefined> }[] },
    { mute: boolean },
  ]
>(() => Promise.resolve());
jest.mock('@fingerprintjs/fingerprintjs', () => ({
  __esModule: true,
  default: { load: mockLoad },
}));
jest.mock('@/lib/request', () => ({ http: { post: mockPost } }));

beforeEach(() => {
  jest.resetModules();
  mockLoad.mockReset();
  mockPost.mockClear();
});

function click() {
  return jest.requireActual<typeof import('./trackButtonClick')>(
    './trackButtonClick'
  ).trackButtonClick;
}

const visitor = {
  get: async () => ({ visitorId: 'visitor' }),
} as unknown as Awaited<ReturnType<typeof FingerprintJS.load>>;

it.each(['load', 'get'])(
  'delivers clicks without a fingerprint when %s fails',
  async stage => {
    if (stage === 'load')
      mockLoad.mockRejectedValue(new Error('fingerprint blocked'));
    else
      mockLoad.mockResolvedValue({
        get: () => Promise.reject(new Error('fingerprint blocked')),
      });
    const trackClick = click();
    trackClick('chat_message_send');
    trackClick('settings_binding_create', { app_id: 'telegram_bot' });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost).toHaveBeenCalledWith(
      '/trace',
      {
        events: [
          {
            name: 'button_click',
            props: { finger: undefined, name: 'chat_message_send' },
          },
        ],
      },
      { mute: true }
    );
    expect(mockPost).toHaveBeenCalledWith(
      '/trace',
      {
        events: [
          {
            name: 'button_click',
            props: {
              finger: undefined,
              name: 'settings_binding_create',
              app_id: 'telegram_bot',
            },
          },
        ],
      },
      { mute: true }
    );
  }
);

it('restores fingerprint attribution after a failure without losing either click', async () => {
  mockLoad
    .mockRejectedValueOnce(new Error('fingerprint blocked'))
    .mockResolvedValue(visitor);
  const trackClick = click();
  trackClick('chat_message_send');
  await new Promise(resolve => setTimeout(resolve, 0));
  trackClick('chat_message_send');
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(mockPost).toHaveBeenCalledTimes(2);
  expect(mockLoad).toHaveBeenCalledTimes(2);
  expect(
    mockPost.mock.calls.map(([, body]) => body.events[0].props.finger)
  ).toEqual([undefined, 'visitor']);
});
