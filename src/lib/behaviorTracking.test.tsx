/** @jest-environment jsdom */
import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { behaviorRequestHeaders } from './behaviorRequest';
import {
  behavior,
  configureBehaviorTracking,
  useBehaviorSurface,
} from './behaviorTracking';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
function Surface() {
  useBehaviorSurface({ scope: 'surface', target: 'settings' });
  return null;
}
afterEach(() => {
  configureBehaviorTracking(false, async () => {});
  behavior.visits.forEach(visit => visit.discard());
  delete (window as Window & { ReactNativeWebView?: unknown })
    .ReactNativeWebView;
  delete (window as Window & { __omniboxNativeBehavior?: unknown })
    .__omniboxNativeBehavior;
});
it('does not double-report an exposure under React StrictMode and releases a real unmount', async () => {
  localStorage.setItem('uid', 'user');
  jest.spyOn(document, 'hasFocus').mockReturnValue(true);
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  });
  const send = jest.fn<Promise<void>, [string, unknown]>(() =>
    Promise.resolve()
  );
  configureBehaviorTracking(true, send);
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () =>
    root.render(
      <StrictMode>
        <Surface />
      </StrictMode>
    )
  );
  expect(
    send.mock.calls.filter(call => call[0] === 'ui_exposure')
  ).toHaveLength(1);
  await act(async () => root.unmount());
  expect(behavior.visits.size).toBe(0);
  host.remove();
  jest.restoreAllMocks();
});
it('uses the opt-in native bridge and native platform for H5 business writes, without sending a second web stream', () => {
  const native = window as Window & {
    ReactNativeWebView?: { postMessage: jest.Mock };
    __omniboxNativeBehavior?: boolean;
    __omniboxNativePlatform?: string;
  };
  native.ReactNativeWebView = { postMessage: jest.fn() };
  native.__omniboxNativeBehavior = true;
  native.__omniboxNativePlatform = 'ios';
  const send = jest.fn<Promise<void>, [string, unknown]>(() =>
    Promise.resolve()
  );
  configureBehaviorTracking(true, send);
  const headers = behaviorRequestHeaders(
    'POST',
    '/namespaces/ns/resources/resource/comment-threads',
    { type: 'document' }
  );
  expect(headers['X-Client-Platform']).toBe('ios');
  expect(send).not.toHaveBeenCalled();
  expect(
    JSON.parse(native.ReactNativeWebView.postMessage.mock.calls[0][0])
  ).toMatchObject({
    type: 'omnibox:behavior',
    event: {
      name: 'core_action_start',
      props: { action_type: 'document_comment' },
    },
  });
});
