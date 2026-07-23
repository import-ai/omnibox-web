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
    expect(current).toEqual({ data: null, loading: true });

    await act(async () => {
      response.reject(new Error('network error'));
      await response.promise.catch(() => undefined);
    });
    expect(current).toEqual({ data: null, loading: false });
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
    expect(current).toEqual({ data: null, loading: true });

    await act(async () => {
      firstResponse.resolve(usage(1));
      await firstResponse.promise;
    });
    expect(current).toEqual({ data: null, loading: true });

    const latestUsage = usage(2);
    await act(async () => {
      secondResponse.resolve(latestUsage);
      await secondResponse.promise;
    });
    expect(current).toEqual({ data: latestUsage, loading: false });
  });
});
