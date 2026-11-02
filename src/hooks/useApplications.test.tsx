/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import type { Application } from '@/interface';
import { http } from '@/lib/request';

import useApplications from './useApplications';

jest.mock('@/lib/request', () => ({
  http: {
    delete: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
  },
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function application(partial: Partial<Application> = {}): Application {
  return {
    id: 'application-1',
    namespace_id: 'namespace-1',
    user_id: 'user-1',
    app_id: 'wechat_oa_bot',
    ...partial,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe('useApplications', () => {
  let container: HTMLDivElement;
  let root: Root;
  let current: ReturnType<typeof useApplications>;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  function Probe() {
    current = useApplications('namespace-1');
    return null;
  }

  it('returns the bound application without waiting for the list refresh', async () => {
    const created = application();
    const refresh = deferred<Application[]>();
    const get = http.get as jest.Mock;
    const post = http.post as jest.Mock;
    get.mockResolvedValueOnce([]).mockReturnValueOnce(refresh.promise);
    post.mockResolvedValueOnce(created);

    await act(async () => root.render(<Probe />));
    expect(current.loading).toBe(false);

    let binding!: Promise<Application>;
    await act(async () => {
      binding = current.bindApplication('wechat_oa_bot');
      await binding;
    });

    await expect(binding).resolves.toBe(created);
    expect(post).toHaveBeenCalledWith(
      '/namespaces/namespace-1/applications/wechat_oa_bot',
      undefined,
      { mute: true }
    );
    expect(get).toHaveBeenCalledTimes(2);
    expect(current.applications).toEqual([created]);
    expect(current.loading).toBe(false);

    await act(async () => {
      refresh.resolve([created]);
      await refresh.promise;
    });
    expect(current.applications).toEqual([created]);
    expect(current.loading).toBe(false);
  });

  it('does not let an older background refresh overwrite newer data', async () => {
    const created = application({ attrs: { key: 'pending-code' } });
    const refreshed = application({ api_key_id: 'api-key-1' });
    const staleRefresh = deferred<Application[]>();
    const get = http.get as jest.Mock;
    const post = http.post as jest.Mock;
    get
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(staleRefresh.promise)
      .mockResolvedValueOnce([refreshed]);
    post.mockResolvedValueOnce(created);

    await act(async () => root.render(<Probe />));
    await act(async () => {
      await current.bindApplication('wechat_oa_bot');
    });
    expect(current.applications).toEqual([created]);

    await act(async () => {
      await current.refetch({ showLoading: false });
    });
    expect(current.applications).toEqual([refreshed]);

    await act(async () => {
      staleRefresh.resolve([application()]);
      await staleRefresh.promise;
    });

    expect(current.applications).toEqual([refreshed]);
  });

  it('can remove an application without showing the list loading state', async () => {
    const existing = application({ attrs: { key: 'pending-code' } });
    const refresh = deferred<Application[]>();
    const get = http.get as jest.Mock;
    const remove = http.delete as jest.Mock;
    get.mockResolvedValueOnce([existing]).mockReturnValueOnce(refresh.promise);
    remove.mockResolvedValueOnce(undefined);

    await act(async () => root.render(<Probe />));
    await act(async () => {
      await current.unbindApplication(existing.id, { showLoading: false });
    });

    expect(remove).toHaveBeenCalledWith(
      '/namespaces/namespace-1/applications/application-1',
      { mute: true }
    );
    expect(current.applications).toEqual([]);
    expect(current.loading).toBe(false);

    await act(async () => {
      refresh.resolve([]);
      await refresh.promise;
    });
  });
});
