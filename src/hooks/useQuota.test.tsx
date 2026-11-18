/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';

import useQuota, { UsageData } from './useQuota';

jest.mock('@/lib/request', () => ({
  http: {
    get: jest.fn(),
  },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function usage(total: number): UsageData {
  return {
    storage_bytes: {
      upload: 0,
      file: 0,
      other_users: 0,
      total,
      subscription_total: total,
      onetime_total: 0,
    },
    video_audio_parse: {
      video: 0,
      audio: 0,
      other_users: 0,
      total: 0,
      subscription_total: 0,
      onetime_total: 0,
    },
    doc_parse: {
      pdf: 0,
      image: 0,
      other_users: 0,
      total: 0,
      subscription_total: 0,
      onetime_total: 0,
    },
    agent_credits: {
      self: 0,
      other_users: 0,
      total: 0,
      subscription_total: 0,
      onetime_total: 0,
    },
    basic: { expired: false, expire_date: null },
    show_members_usage: false,
  };
}

describe('useQuota', () => {
  let container: HTMLDivElement;
  let root: Root;
  let current: ReturnType<typeof useQuota>;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  function Probe({ namespaceId }: { namespaceId: string }) {
    current = useQuota(namespaceId);
    return null;
  }

  it('does not expose placeholder quota data while loading or after failure', async () => {
    const response = deferred<UsageData>();
    (http.get as jest.Mock).mockReturnValueOnce(response.promise);

    await act(async () => root.render(<Probe namespaceId="namespace-a" />));
    expect(current.data).toBeNull();
    expect(current.loading).toBe(true);
    expect(typeof current.refresh).toBe('function');

    await act(async () => {
      response.reject(new Error('network error'));
      await response.promise.catch(() => undefined);
    });
    expect(current.data).toBeNull();
    expect(current.loading).toBe(false);
  });

  it('ignores an old response after the namespace changes', async () => {
    const firstResponse = deferred<UsageData>();
    const secondResponse = deferred<UsageData>();
    const get = http.get as jest.Mock;
    get
      .mockReturnValueOnce(firstResponse.promise)
      .mockReturnValueOnce(secondResponse.promise);

    await act(async () => root.render(<Probe namespaceId="namespace-a" />));
    await act(async () => root.render(<Probe namespaceId="namespace-b" />));

    expect(get).toHaveBeenNthCalledWith(
      1,
      '/namespaces/namespace-a/usages',
      expect.objectContaining({ cancelToken: expect.anything() })
    );
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/namespaces/namespace-b/usages',
      expect.objectContaining({ cancelToken: expect.anything() })
    );
    expect(current.data).toBeNull();
    expect(current.loading).toBe(true);

    await act(async () => {
      firstResponse.resolve(usage(1));
      await firstResponse.promise;
    });
    expect(current.data).toBeNull();
    expect(current.loading).toBe(true);

    const latestUsage = usage(2);
    await act(async () => {
      secondResponse.resolve(latestUsage);
      await secondResponse.promise;
    });
    expect(current.data).toEqual(latestUsage);
    expect(current.loading).toBe(false);
  });

  it('retains loaded usage and performs no request when the window regains focus', async () => {
    const data = usage(123);
    (http.get as jest.Mock).mockResolvedValue(data);
    await act(async () => root.render(<Probe namespaceId="namespace-a" />));
    expect(current.data).toEqual(data);
    expect(current.loading).toBe(false);
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(current.data).toEqual(data);
    expect(current.loading).toBe(false);
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('refreshes without clearing loaded usage and shares an in-flight request', async () => {
    const firstResponse = deferred<UsageData>();
    const refreshResponse = deferred<UsageData>();
    const get = http.get as jest.Mock;
    get
      .mockReturnValueOnce(firstResponse.promise)
      .mockReturnValueOnce(refreshResponse.promise);

    await act(async () => root.render(<Probe namespaceId="namespace-a" />));
    const initial = usage(1);
    await act(async () => {
      firstResponse.resolve(initial);
      await firstResponse.promise;
    });

    let refreshPromise!: Promise<void>;
    let duplicatePromise!: Promise<void>;
    await act(async () => {
      refreshPromise = current.refresh();
      duplicatePromise = current.refresh();
      await Promise.resolve();
    });

    expect(get).toHaveBeenCalledTimes(2);
    expect(current.data).toEqual(initial);
    expect(current.loading).toBe(false);

    const updated = usage(2);
    await act(async () => {
      refreshResponse.resolve(updated);
      await Promise.all([refreshPromise, duplicatePromise]);
    });

    expect(current.data).toEqual(updated);
    expect(current.loading).toBe(false);
  });

  it('keeps loaded usage when a background refresh fails', async () => {
    const initial = usage(1);
    const refreshResponse = deferred<UsageData>();
    const get = http.get as jest.Mock;
    get
      .mockResolvedValueOnce(initial)
      .mockReturnValueOnce(refreshResponse.promise);

    await act(async () => root.render(<Probe namespaceId="namespace-a" />));
    expect(current.data).toEqual(initial);

    await act(async () => {
      const refreshPromise = current.refresh();
      refreshResponse.reject(new Error('network error'));
      await refreshPromise;
    });

    expect(current.data).toEqual(initial);
    expect(current.loading).toBe(false);
  });

  it('forces a fresh request and ignores an older in-flight response', async () => {
    const initial = usage(1);
    const olderRefresh = deferred<UsageData>();
    const forcedRefresh = deferred<UsageData>();
    const get = http.get as jest.Mock;
    get
      .mockResolvedValueOnce(initial)
      .mockReturnValueOnce(olderRefresh.promise)
      .mockReturnValueOnce(forcedRefresh.promise);

    await act(async () => root.render(<Probe namespaceId="namespace-a" />));

    let olderPromise!: Promise<void>;
    let forcedPromise!: Promise<void>;
    await act(async () => {
      olderPromise = current.refresh();
      forcedPromise = current.refresh({ force: true });
      await Promise.resolve();
    });
    expect(get).toHaveBeenCalledTimes(3);

    const latest = usage(3);
    await act(async () => {
      forcedRefresh.resolve(latest);
      await forcedPromise;
    });
    expect(current.data).toEqual(latest);

    await act(async () => {
      olderRefresh.resolve(usage(2));
      await olderPromise;
    });
    expect(current.data).toEqual(latest);
  });
});
