/** @jest-environment jsdom */

import type { AxiosAdapter, AxiosResponse } from 'axios';
import { AxiosError } from 'axios';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';

import request from '@/lib/request';
import { removeGlobalCredential } from '@/page/user/util';

import useNamespaceList from './useNamespaceList';

const mockApp = {
  on: jest.fn<() => void, [string, () => void]>(() => jest.fn()),
};

jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => mockApp,
}));
jest.mock('lodash-es', () => ({
  isUndefined: (value: unknown) => value === undefined,
}));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('i18next', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));
jest.mock('@/const', () => ({ API_BASE_URL: '/api/v1' }));
jest.mock('@/page/user/util', () => ({ removeGlobalCredential: jest.fn() }));
jest.mock('@/lib/detectLanguage', () => ({
  detectBrowserLanguage: () => 'en',
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function Probe({ endpoint = 'namespaces' }: { endpoint?: string }) {
  const { data, loading } = useNamespaceList(endpoint, false);
  return (
    <div data-loading={loading}>
      {data.map(namespace => namespace.name).join(',')}
    </div>
  );
}

type RefreshSource = 'focus' | 'visibility' | 'poll' | 'event';

function refresh(source: RefreshSource) {
  if (source === 'focus') window.dispatchEvent(new Event('focus'));
  else if (source === 'visibility') {
    document.dispatchEvent(new Event('visibilitychange'));
  } else if (source === 'poll') jest.advanceTimersByTime(10_000);
  else {
    const listener = mockApp.on.mock.calls.find(
      ([event]) => event === 'namespaces_refetch'
    )?.[1];
    if (!listener) throw new Error('Namespace refresh listener missing');
    listener();
  }
}

describe('namespace refresh error reporting', () => {
  const originalAdapter = request.defaults.adapter;
  const originalLocation = window.location;
  let adapter: jest.MockedFunction<AxiosAdapter>;
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    localStorage.setItem('uid', 'user-a');
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/space/chat', href: 'http://localhost/space/chat' },
    });
    adapter = jest.fn(async config => ({
      config,
      data: [{ id: 'space-a', name: 'Space A' }],
      status: 200,
      statusText: 'OK',
      headers: {},
    }));
    request.defaults.adapter = adapter;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    request.defaults.adapter = originalAdapter;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    localStorage.clear();
    jest.useRealTimers();
  });

  function failRequests(status?: number, code?: string) {
    adapter.mockImplementation(async config => {
      throw new AxiosError(
        'Request failed',
        status ? 'ERR_BAD_RESPONSE' : 'ERR_NETWORK',
        config,
        undefined,
        status
          ? { config, data: { code }, status, statusText: 'Error', headers: {} }
          : undefined
      );
    });
  }

  it.each(['namespaces', 'pro-namespaces'])(
    'reports an initial %s failure but silences automatic retries',
    async endpoint => {
      failRequests();
      await act(async () => root.render(<Probe endpoint={endpoint} />));
      expect(toast.error).toHaveBeenCalledTimes(1);

      for (let attempt = 0; attempt < 3; attempt++) {
        await act(async () => refresh('poll'));
      }
      expect(adapter).toHaveBeenCalledTimes(4);
      expect(toast.error).toHaveBeenCalledTimes(1);
    }
  );

  it.each(['focus', 'visibility', 'poll'] as const)(
    'silences repeated %s failures, keeps data, and recovers',
    async source => {
      await act(async () => root.render(<Probe />));
      failRequests(503);
      for (let attempt = 0; attempt < 3; attempt++) {
        await act(async () => refresh(source));
      }
      expect(adapter).toHaveBeenCalledTimes(4);
      expect(toast.error).not.toHaveBeenCalled();
      expect(container.textContent).toBe('Space A');
      expect(container.firstElementChild?.getAttribute('data-loading')).toBe(
        'false'
      );

      adapter.mockImplementation(async config => ({
        config,
        data: [{ id: 'space-a', name: 'Renamed Space' }],
        status: 200,
        statusText: 'OK',
        headers: {},
      }));
      await act(async () => refresh(source));
      expect(container.textContent).toBe('Renamed Space');
    }
  );

  it('still reports failures from an explicit namespace refresh event', async () => {
    await act(async () => root.render(<Probe />));
    failRequests(503);
    await act(async () => refresh('event'));
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('keeps an automatic refresh queued during initial loading silent', async () => {
    let finishInitial!: (response: AxiosResponse) => void;
    adapter.mockImplementationOnce(
      config =>
        new Promise(resolve => {
          finishInitial = response => resolve({ ...response, config });
        })
    );
    await act(async () => root.render(<Probe />));
    await act(async () => refresh('poll'));
    failRequests(503);
    await act(async () =>
      finishInitial({
        config: adapter.mock.calls[0][0],
        data: [{ id: 'space-a', name: 'Space A' }],
        status: 200,
        statusText: 'OK',
        headers: {},
      })
    );
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(toast.error).not.toHaveBeenCalled();
    expect(container.textContent).toBe('Space A');
  });

  it.each([
    ['focus', 'event', 'poll'],
    ['event', 'focus', 'poll'],
  ] as const)(
    'keeps foreground priority when queued signals arrive as %s, %s, %s',
    async (...sources) => {
      await act(async () => root.render(<Probe />));
      let failSlowRequest!: (error: AxiosError) => void;
      adapter.mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            failSlowRequest = reject;
          })
      );
      await act(async () => refresh('focus'));
      for (const source of sources) {
        await act(async () => refresh(source));
      }
      expect(adapter).toHaveBeenCalledTimes(2);
      failRequests(503);
      await act(async () =>
        failSlowRequest(
          new AxiosError(
            'Network unavailable',
            'ERR_NETWORK',
            adapter.mock.calls[1][0]
          )
        )
      );
      expect(adapter).toHaveBeenCalledTimes(3);
      expect(toast.error).toHaveBeenCalledTimes(1);
    }
  );

  it.each([
    [401, undefined],
    [401, 'TOKEN_EXPIRED'],
    [403, 'INVALID_TOKEN'],
  ] as const)(
    'preserves authentication handling for background status %s, code %s',
    async (status, code) => {
      await act(async () => root.render(<Probe />));
      failRequests(status, code);
      await act(async () => refresh('focus'));
      expect(removeGlobalCredential).toHaveBeenCalled();
      await act(async () => jest.advanceTimersByTime(1000));
      expect(window.location.href).toContain('/user/login');
    }
  );
});
