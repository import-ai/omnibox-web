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
      syncBindingIds: enabled
        ? [
            'wechat_oa_bot',
            'wechat_bot',
            'qq_bot',
            'wechat_clawbot',
            'telegram_bot',
          ]
        : [],
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
    expect(onUnbound).toHaveBeenCalledWith([bound]);
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

  it.each(['wechat_bot', 'qq_bot', 'wechat_clawbot', 'telegram_bot'])(
    'synchronizes %s without a bound WeChat AI assistant',
    async appId => {
      const existing = { ...bound, app_id: appId };
      jest.mocked(http.get).mockResolvedValueOnce([existing]);
      await act(async () => root.render(createElement(Probe)));
      jest.mocked(http.get).mockResolvedValue([{ app_id: appId }]);
      await act(async () => jest.advanceTimersByTime(3000));
      expect(latest.applications).toEqual([{ app_id: appId }]);
      expect(onUnbound).toHaveBeenCalledTimes(1);
    }
  );

  it('detects another assistant removed during a local mutation refresh', async () => {
    const qq = { ...bound, app_id: 'qq_bot', id: 'qq-1' };
    const telegram = { ...bound, app_id: 'telegram_bot', id: 'telegram-1' };
    jest.mocked(http.get).mockResolvedValueOnce([qq, telegram]);
    await act(async () => root.render(createElement(Probe)));
    jest.mocked(http.delete).mockResolvedValue(undefined);
    jest
      .mocked(http.get)
      .mockResolvedValue([{ app_id: 'qq_bot' }, { app_id: 'telegram_bot' }]);
    await act(async () => latest.unbindApplication(telegram.id));
    expect(onUnbound).toHaveBeenCalledTimes(1);
    expect(onUnbound).toHaveBeenCalledWith([qq]);
  });

  it('reports all simultaneous removals in one batch and stops polling', async () => {
    const qq = { ...bound, app_id: 'qq_bot', id: 'qq-1' };
    jest.mocked(http.get).mockResolvedValueOnce([bound, qq]);
    await act(async () => root.render(createElement(Probe)));
    jest.mocked(http.get).mockResolvedValue([unbound, { app_id: 'qq_bot' }]);
    await act(async () => jest.advanceTimersByTime(3000));
    await act(async () => jest.advanceTimersByTime(9000));
    expect(onUnbound).toHaveBeenCalledTimes(1);
    expect(onUnbound).toHaveBeenCalledWith([bound, qq]);
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('recovers an initial fetch failure on focus without historical notifications', async () => {
    jest.mocked(http.get).mockRejectedValueOnce(new Error('offline'));
    await act(async () => root.render(createElement(Probe)));
    jest.mocked(http.get).mockResolvedValue([unbound]);
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(latest.applications).toEqual([unbound]);
    expect(latest.error).toBeNull();
    expect(onUnbound).not.toHaveBeenCalled();
  });

  it.each([
    { response: [] },
    {
      response: [
        {
          ...bound,
          id: 'new-binding',
          attrs: { key: 'pending' },
          api_key_id: undefined,
        },
      ],
    },
    { response: [{ ...bound, id: 'new-binding', api_key_id: 'new-key' }] },
  ])(
    'does not announce missing rows or replacement bindings: %j',
    async ({ response }) => {
      await act(async () => root.render(createElement(Probe)));
      jest.mocked(http.get).mockResolvedValue(response);
      await act(async () => jest.advanceTimersByTime(3000));
      expect(onUnbound).not.toHaveBeenCalled();
    }
  );

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

  it.each(['namespace', 'inactive', 'unmount'])(
    'rejects new writes from an obsolete session after %s',
    async change => {
      await act(async () => root.render(createElement(Probe)));
      const previous = latest;
      await act(async () => {
        if (change === 'namespace')
          root.render(createElement(Probe, { namespaceId: 'space-2' }));
        if (change === 'inactive')
          root.render(createElement(Probe, { active: false }));
        if (change === 'unmount') root.render(null);
      });
      await expect(
        previous.bindApplication('wechat_oa_bot')
      ).rejects.toMatchObject({
        name: 'AbortError',
      });
      await expect(previous.unbindApplication(bound.id)).rejects.toMatchObject({
        name: 'AbortError',
      });
      expect(http.post).not.toHaveBeenCalled();
      expect(http.delete).not.toHaveBeenCalled();
    }
  );

  it('stops an expired-binding continuation from posting after the namespace changes', async () => {
    await act(async () => root.render(createElement(Probe)));
    const previous = latest;
    const deletion = deferred<void>();
    jest.mocked(http.delete).mockReturnValueOnce(deletion.promise);
    const continuation = previous
      .unbindApplication(bound.id)
      .then(() => previous.bindApplication(bound.app_id));
    const outcome = expect(continuation).rejects.toMatchObject({
      name: 'AbortError',
    });
    await act(async () =>
      root.render(createElement(Probe, { namespaceId: 'space-2' }))
    );
    await act(async () => deletion.resolve());
    await outcome;
    expect(http.post).not.toHaveBeenCalled();
  });

  it.each(['external', 'namespace', 'inactive', 'unmount', 'mutation'])(
    'aborts status requests and rejects late success after %s cancellation',
    async change => {
      await act(async () => root.render(createElement(Probe)));
      const pending = deferred<Application>();
      jest.mocked(http.get).mockReturnValueOnce(pending.promise);
      const external = new AbortController();
      const query = latest.checkApplicationStatus(bound.id, {
        signal: external.signal,
      });
      const outcome = expect(query).rejects.toMatchObject({
        name: 'AbortError',
      });
      const signal = jest.mocked(http.get).mock.calls.at(-1)?.[1]?.signal;
      await act(async () => {
        if (change === 'external') external.abort();
        if (change === 'namespace')
          root.render(createElement(Probe, { namespaceId: 'space-2' }));
        if (change === 'inactive')
          root.render(createElement(Probe, { active: false }));
        if (change === 'unmount') root.render(null);
        if (change === 'mutation') {
          jest.mocked(http.delete).mockResolvedValueOnce(undefined);
          await latest.unbindApplication(bound.id);
        }
      });
      expect(signal?.aborted).toBe(true);
      await act(async () => pending.resolve(bound));
      await outcome;
    }
  );

  it('rejects an older creation for the same app and never refreshes its stale result', async () => {
    await act(async () => root.render(createElement(Probe)));
    const older = deferred<Application>();
    const newer = deferred<Application>();
    const list = deferred<Application[]>();
    jest
      .mocked(http.post)
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    jest.mocked(http.get).mockReturnValueOnce(list.promise);
    const first = latest.bindApplication(bound.app_id);
    const firstOutcome = first.then(
      value => ({ value, error: undefined }),
      error => ({ value: undefined, error })
    );
    const second = latest.bindApplication(bound.app_id);
    const current = { ...bound, id: 'new-binding' };
    await act(async () => {
      newer.resolve(current);
      await second;
    });
    expect(latest.applications).toEqual([current]);
    await act(async () => {
      older.resolve({ ...bound, id: 'old-binding' });
      await firstOutcome;
    });
    expect((await firstOutcome).error).toMatchObject({ name: 'AbortError' });
    expect(latest.applications).toEqual([current]);
    expect(http.get).toHaveBeenCalledTimes(2);
    await act(async () => list.resolve([current]));
    expect(latest.applications).toEqual([current]);
  });

  it('merges different apps created concurrently and ignores an older list refresh', async () => {
    jest.mocked(http.get).mockResolvedValueOnce([]);
    await act(async () => root.render(createElement(Probe)));
    const firstCreation = deferred<Application>();
    const secondCreation = deferred<Application>();
    const staleList = deferred<Application[]>();
    const currentList = deferred<Application[]>();
    jest
      .mocked(http.post)
      .mockReturnValueOnce(firstCreation.promise)
      .mockReturnValueOnce(secondCreation.promise);
    jest
      .mocked(http.get)
      .mockReturnValueOnce(staleList.promise)
      .mockReturnValueOnce(currentList.promise);
    const first = latest.bindApplication('wechat_oa_bot');
    const second = latest.bindApplication('qq_bot');
    const qq = { ...bound, app_id: 'qq_bot', id: 'qq-binding' };
    await act(async () => {
      secondCreation.resolve(qq);
      await second;
    });
    await act(async () => {
      firstCreation.resolve(bound);
      await first;
    });
    expect(latest.applications).toEqual([qq, bound]);
    await act(async () => currentList.resolve([bound, qq]));
    await act(async () => staleList.resolve([qq]));
    expect(latest.applications).toEqual([bound, qq]);
  });

  it('removes a successfully deleted binding even if the refresh fails', async () => {
    await act(async () => root.render(createElement(Probe)));
    jest.mocked(http.delete).mockResolvedValue(undefined);
    jest.mocked(http.get).mockRejectedValueOnce(new Error('offline'));
    await act(async () => latest.unbindApplication(bound.id));

    expect(latest.applications).toEqual([unbound]);
  });
  it('retains the last confirmed snapshot and keeps polling after an incomplete response', async () => {
    await act(async () => root.render(createElement(Probe)));
    jest.mocked(http.get).mockResolvedValueOnce([]);
    await act(async () => jest.advanceTimersByTime(3000));
    expect(latest.applications).toEqual([bound]);
    expect(onUnbound).not.toHaveBeenCalled();
    jest.mocked(http.get).mockResolvedValueOnce([unbound]);
    await act(async () => jest.advanceTimersByTime(3000));
    expect(latest.applications).toEqual([unbound]);
    expect(onUnbound).toHaveBeenCalledWith([bound]);
  });

  it.each([
    null,
    '<html>Gateway unavailable</html>',
    [null],
    [{ id: 'invalid-row' }],
    [unbound, bound],
  ])(
    'keeps malformed list data out of the confirmed state: %j',
    async response => {
      await act(async () => root.render(createElement(Probe)));
      jest.mocked(http.get).mockResolvedValueOnce(response);
      await act(async () => jest.advanceTimersByTime(3000));
      expect(latest.applications).toEqual([bound]);
      expect(onUnbound).not.toHaveBeenCalled();
      jest.mocked(http.get).mockResolvedValueOnce([unbound]);
      await act(async () => jest.advanceTimersByTime(3000));
      expect(latest.applications).toEqual([unbound]);
      expect(onUnbound).toHaveBeenCalledWith([bound]);
    }
  );

  it('does not start a status read while cancellation is still pending', async () => {
    await act(async () => root.render(createElement(Probe)));
    const deletion = deferred<void>();
    jest.mocked(http.delete).mockReturnValueOnce(deletion.promise);
    const operation = latest.unbindApplication(bound.id);
    const calls = jest.mocked(http.get).mock.calls.length;
    jest.mocked(http.get).mockResolvedValueOnce(bound);
    await expect(latest.checkApplicationStatus(bound.id)).rejects.toMatchObject(
      { name: 'AbortError' }
    );
    expect(http.get).toHaveBeenCalledTimes(calls);
    jest.mocked(http.get).mockReset().mockResolvedValue([unbound]);
    await act(async () => {
      deletion.resolve();
      await operation;
    });
    jest.mocked(http.get).mockResolvedValueOnce(bound);
    await expect(latest.checkApplicationStatus(bound.id)).resolves.toEqual(
      bound
    );
  });
  it('isolates another account in the same namespace and rejects its old list response', async () => {
    await act(async () => root.render(createElement(Probe)));
    const old = deferred<Application[]>();
    jest.mocked(http.get).mockReturnValueOnce(old.promise);
    await act(async () => jest.advanceTimersByTime(3000));
    const previous = latest;
    const signal = jest.mocked(http.get).mock.calls.at(-1)?.[1]?.signal;
    jest.mocked(http.get).mockResolvedValueOnce([unbound]);
    await act(async () => {
      localStorage.setItem('uid', 'another-account');
      window.dispatchEvent(new Event('omnibox:credential-changed'));
    });
    expect(signal?.aborted).toBe(true);
    await act(async () => old.resolve([bound]));
    expect(latest.applications).toEqual([unbound]);
    expect(onUnbound).not.toHaveBeenCalled();
    await expect(previous.bindApplication(bound.app_id)).rejects.toMatchObject({
      name: 'AbortError',
    });
    localStorage.removeItem('uid');
  });
});
