/** @jest-environment jsdom */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { Application } from '@/interface';
import { http } from '@/lib/request';

import useApplications from './useApplications';

jest.mock('@/lib/request', () => ({
  http: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));
jest.mock('@/const', () => ({ BIND_CHECK_INTERVAL: 3000 }));

const bound = {
  app_id: 'wechat_oa_bot',
  id: 'binding-1',
  api_key_id: 'key-1',
} as Application;
const unbound = { app_id: 'wechat_oa_bot' } as Application;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('useApplications remote unbinding', () => {
  let root: Root;
  let latest: ReturnType<typeof useApplications>;
  const onUnbound = jest.fn();

  function Probe({ namespaceId = 'space-1', enabled = true, active = true }) {
    latest = useApplications(namespaceId, {
      active,
      syncWechatBinding: enabled,
      onUnbound,
    });
    return null;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    root = createRoot(document.createElement('div'));
    jest.mocked(http.get).mockResolvedValue([bound]);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    jest.useRealTimers();
  });

  it('updates the open page after remote unbinding without a local action', async () => {
    await act(async () => root.render(createElement(Probe)));
    jest.mocked(http.get).mockResolvedValue([unbound]);

    await act(async () => jest.advanceTimersByTime(3000));

    expect(latest.applications).toEqual([unbound]);
    expect(onUnbound).toHaveBeenCalledTimes(1);
    expect(onUnbound).toHaveBeenCalledWith(bound);
    expect(latest.loading).toBe(false);
  });

  it('does not notify for initial unbound data or keep polling it', async () => {
    jest.mocked(http.get).mockResolvedValue([unbound]);
    await act(async () => root.render(createElement(Probe)));
    await act(async () => jest.advanceTimersByTime(9000));

    expect(onUnbound).not.toHaveBeenCalled();
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('preserves existing consumers that do not enable synchronization', async () => {
    await act(async () =>
      root.render(createElement(Probe, { enabled: false }))
    );
    await act(async () => jest.advanceTimersByTime(9000));

    expect(http.get).toHaveBeenCalledTimes(1);
    expect(onUnbound).not.toHaveBeenCalled();
  });

  it('does not start AI-assistant polling for the separate collection assistant', async () => {
    jest
      .mocked(http.get)
      .mockResolvedValue([{ ...bound, app_id: 'wechat_bot' }]);
    await act(async () => root.render(createElement(Probe)));
    await act(async () => jest.advanceTimersByTime(9000));

    expect(http.get).toHaveBeenCalledTimes(1);
    expect(onUnbound).not.toHaveBeenCalled();
  });

  it('preserves confirmed data when a silent poll fails and recovers later', async () => {
    await act(async () => root.render(createElement(Probe)));
    jest.mocked(http.get).mockRejectedValueOnce(new Error('offline'));
    await act(async () => jest.advanceTimersByTime(3000));

    expect(latest.applications).toEqual([bound]);
    expect(latest.loading).toBe(false);
    expect(latest.error).toBeNull();
    expect(onUnbound).not.toHaveBeenCalled();
    expect(http.get).toHaveBeenLastCalledWith(
      '/namespaces/space-1/applications',
      expect.objectContaining({ mute: true })
    );

    jest.mocked(http.get).mockResolvedValue([unbound]);
    await act(async () => jest.advanceTimersByTime(3000));
    expect(latest.applications).toEqual([unbound]);
    expect(onUnbound).toHaveBeenCalledTimes(1);
  });

  it('does not flash loading or overlap slow background requests', async () => {
    await act(async () => root.render(createElement(Probe)));
    const poll = deferred<Application[]>();
    jest.mocked(http.get).mockReturnValueOnce(poll.promise);
    await act(async () => jest.advanceTimersByTime(12000));

    expect(http.get).toHaveBeenCalledTimes(2);
    expect(latest.loading).toBe(false);
    expect(latest.applications).toEqual([bound]);

    await act(async () => poll.resolve([unbound]));
    await act(async () => jest.advanceTimersByTime(9000));
    expect(onUnbound).toHaveBeenCalledTimes(1);
  });

  it('pauses hidden polling and refreshes immediately when visible again', async () => {
    await act(async () => root.render(createElement(Probe)));
    Object.defineProperty(document, 'visibilityState', { value: 'hidden' });
    await act(async () => jest.advanceTimersByTime(9000));
    expect(http.get).toHaveBeenCalledTimes(1);

    jest.mocked(http.get).mockResolvedValue([unbound]);
    Object.defineProperty(document, 'visibilityState', { value: 'visible' });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });

    expect(http.get).toHaveBeenCalledTimes(2);
    expect(latest.applications).toEqual([unbound]);
    expect(onUnbound).toHaveBeenCalledTimes(1);
  });

  it('ignores a response from the previous namespace', async () => {
    const oldRequest = deferred<Application[]>();
    jest.mocked(http.get).mockReturnValueOnce(oldRequest.promise);
    await act(async () => root.render(createElement(Probe)));
    jest.mocked(http.get).mockResolvedValue([unbound]);
    await act(async () =>
      root.render(createElement(Probe, { namespaceId: 'space-2' }))
    );
    await act(async () => oldRequest.resolve([bound]));

    expect(latest.applications).toEqual([unbound]);
    expect(latest.loading).toBe(false);
    expect(onUnbound).not.toHaveBeenCalled();
  });

  it('does not expose the previous namespace when the new fetch fails', async () => {
    await act(async () => root.render(createElement(Probe)));
    jest.mocked(http.get).mockRejectedValueOnce(new Error('unavailable'));
    await act(async () =>
      root.render(createElement(Probe, { namespaceId: 'space-2' }))
    );

    expect(latest.applications).toEqual([]);
    expect(latest.loading).toBe(false);
    expect(latest.error).toBe('unavailable');
  });

  it('ignores an in-flight poll after unmounting and removes listeners', async () => {
    await act(async () => root.render(createElement(Probe)));
    const poll = deferred<Application[]>();
    jest.mocked(http.get).mockReturnValueOnce(poll.promise);
    await act(async () => jest.advanceTimersByTime(3000));
    await act(async () => root.render(null));
    await act(async () => {
      poll.resolve([unbound]);
      jest.advanceTimersByTime(6000);
      window.dispatchEvent(new Event('focus'));
    });

    expect(http.get).toHaveBeenCalledTimes(2);
    expect(onUnbound).not.toHaveBeenCalled();
  });

  it('aborts hidden polls and ignores late responses after returning to the page', async () => {
    await act(async () => root.render(createElement(Probe)));
    const oldPoll = deferred<Application[]>();
    jest.mocked(http.get).mockReturnValueOnce(oldPoll.promise);
    await act(async () => jest.advanceTimersByTime(3000));
    const signal = jest.mocked(http.get).mock.calls[1][1]?.signal;

    Object.defineProperty(document, 'visibilityState', { value: 'hidden' });
    await act(async () =>
      document.dispatchEvent(new Event('visibilitychange'))
    );
    expect(signal?.aborted).toBe(true);

    Object.defineProperty(document, 'visibilityState', { value: 'visible' });
    await act(async () =>
      document.dispatchEvent(new Event('visibilitychange'))
    );
    expect(http.get).toHaveBeenCalledTimes(3);
    await act(async () => oldPoll.resolve([unbound]));

    expect(latest.applications).toEqual([bound]);
    expect(onUnbound).not.toHaveBeenCalled();
  });

  it('checks visibility again before applying a background response', async () => {
    await act(async () => root.render(createElement(Probe)));
    const poll = deferred<Application[]>();
    jest.mocked(http.get).mockReturnValueOnce(poll.promise);
    await act(async () => jest.advanceTimersByTime(3000));
    Object.defineProperty(document, 'visibilityState', { value: 'hidden' });
    await act(async () => poll.resolve([unbound]));

    expect(latest.applications).toEqual([bound]);
    expect(onUnbound).not.toHaveBeenCalled();
  });

  it('stops synchronization immediately when the page becomes inactive before unmounting', async () => {
    await act(async () => root.render(createElement(Probe)));
    const poll = deferred<Application[]>();
    jest.mocked(http.get).mockReturnValueOnce(poll.promise);
    await act(async () => jest.advanceTimersByTime(3000));
    const signal = jest.mocked(http.get).mock.calls[1][1]?.signal;
    await act(async () => root.render(createElement(Probe, { active: false })));
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      poll.resolve([unbound]);
      jest.advanceTimersByTime(9000);
      window.dispatchEvent(new Event('focus'));
    });

    expect(http.get).toHaveBeenCalledTimes(2);
    expect(onUnbound).not.toHaveBeenCalled();
  });

  it('does not let an older poll restore a locally removed binding', async () => {
    await act(async () => root.render(createElement(Probe)));
    const oldPoll = deferred<Application[]>();
    jest.mocked(http.get).mockReturnValueOnce(oldPoll.promise);
    await act(async () => jest.advanceTimersByTime(3000));
    jest.mocked(http.delete).mockResolvedValue(undefined);
    jest.mocked(http.get).mockResolvedValue([unbound]);
    await act(async () => latest.unbindApplication(bound.id));
    await act(async () => oldPoll.resolve([bound]));

    expect(latest.applications).toEqual([unbound]);
  });

  it('removes a successfully deleted binding even if the refresh fails', async () => {
    await act(async () => root.render(createElement(Probe)));
    jest.mocked(http.delete).mockResolvedValue(undefined);
    jest.mocked(http.get).mockRejectedValueOnce(new Error('offline'));
    await act(async () => latest.unbindApplication(bound.id));

    expect(latest.applications).toEqual([unbound]);
  });
});
