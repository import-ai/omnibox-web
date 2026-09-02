/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { Resource } from '@/interface';
import { http } from '@/lib/request';

import useResource from './userResource';

const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
const mockApp = {
  on: jest.fn((event: string, callback: (...args: unknown[]) => void) => {
    listeners[event] = listeners[event] || [];
    listeners[event].push(callback);
    return () => {
      listeners[event] = (listeners[event] || []).filter(
        listener => listener !== callback
      );
    };
  }),
};
let mockPathname = '/namespace-a/resource-a';

jest.mock('./useApp', () => ({
  __esModule: true,
  default: () => mockApp,
}));
jest.mock('@/const', () => ({ SITE_NAME: 'OmniBox' }));
jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));
jest.mock('@/lib/utils', () => ({ setDocumentTitle: jest.fn() }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: mockPathname, state: null }),
  useNavigate: () => jest.fn(),
  useParams: () => ({
    namespace_id: 'namespace-a',
    resource_id: 'resource-a',
  }),
}));

const mockedGet = jest.mocked(http.get);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function ResourceHarness() {
  const state = useResource();
  return (
    <div
      data-content={state.resource?.content ?? ''}
      data-forbidden={String(state.forbidden)}
      data-loading={String(state.loading)}
      data-not-found={String(state.notFound)}
      data-testid="resource-state"
    />
  );
}

function fireApp(event: string, ...args: unknown[]) {
  for (const listener of listeners[event] || []) {
    listener(...args);
  }
}

describe('useResource resource events', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockPathname = '/namespace-a/resource-a';
    Object.keys(listeners).forEach(key => delete listeners[key]);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.clearAllMocks();
  });

  it.each(['update_resource', 'refresh_resource'])(
    'refetches the active resource after %s announces it by id',
    async event => {
      mockedGet
        .mockResolvedValueOnce({
          id: 'resource-a',
          content: 'old body',
        } as Resource)
        .mockResolvedValueOnce({
          id: 'resource-a',
          content: 'new body',
        } as Resource);

      await act(async () => root.render(<ResourceHarness />));
      await act(async () => fireApp(event, 'resource-a'));

      expect(mockedGet).toHaveBeenCalledTimes(2);
      expect(
        container
          .querySelector('[data-testid="resource-state"]')
          ?.getAttribute('data-content')
      ).toBe('new body');
    }
  );

  it('keeps the latest result when consecutive refetches finish out of order', async () => {
    let resolveFirstRefetch: (resource: Resource) => void = () => undefined;
    let resolveSecondRefetch: (resource: Resource) => void = () => undefined;
    mockedGet
      .mockResolvedValueOnce({
        id: 'resource-a',
        content: 'initial body',
      } as Resource)
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolveFirstRefetch = resolve;
        })
      )
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolveSecondRefetch = resolve;
        })
      );

    await act(async () => root.render(<ResourceHarness />));
    await act(async () => {
      fireApp('update_resource', 'resource-a');
      fireApp('refresh_resource', 'resource-a');
    });

    await act(async () => {
      resolveSecondRefetch({
        id: 'resource-a',
        content: 'latest body',
      } as Resource);
    });
    await act(async () => {
      resolveFirstRefetch({
        id: 'resource-a',
        content: 'stale body',
      } as Resource);
    });

    expect(
      container
        .querySelector('[data-testid="resource-state"]')
        ?.getAttribute('data-content')
    ).toBe('latest body');
    expect(
      container
        .querySelector('[data-testid="resource-state"]')
        ?.getAttribute('data-loading')
    ).toBe('false');
  });

  it('keeps the initial request active when switching to the edit route', async () => {
    let resolveResource: (resource: Resource) => void = () => undefined;
    mockedGet.mockReturnValueOnce(
      new Promise(resolve => {
        resolveResource = resolve;
      })
    );

    await act(async () => root.render(<ResourceHarness />));
    const signal = mockedGet.mock.calls[0]?.[1]?.signal;

    mockPathname = '/namespace-a/resource-a/edit';
    await act(async () => root.render(<ResourceHarness />));

    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(signal?.aborted).toBe(false);

    await act(async () => {
      resolveResource({
        id: 'resource-a',
        content: 'loaded body',
      } as Resource);
    });

    expect(
      container
        .querySelector('[data-testid="resource-state"]')
        ?.getAttribute('data-content')
    ).toBe('loaded body');
    expect(
      container
        .querySelector('[data-testid="resource-state"]')
        ?.getAttribute('data-loading')
    ).toBe('false');
  });

  it('keeps an event refetch active when switching to the edit route', async () => {
    let resolveInitial: (resource: Resource) => void = () => undefined;
    let resolveRefetch: (resource: Resource) => void = () => undefined;
    mockedGet
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolveInitial = resolve;
        })
      )
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolveRefetch = resolve;
        })
      );

    await act(async () => root.render(<ResourceHarness />));
    await act(async () => fireApp('update_resource', 'resource-a'));
    const initialSignal = mockedGet.mock.calls[0]?.[1]?.signal;
    const refetchSignal = mockedGet.mock.calls[1]?.[1]?.signal;

    mockPathname = '/namespace-a/resource-a/edit';
    await act(async () => root.render(<ResourceHarness />));

    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(initialSignal?.aborted).toBe(true);
    expect(refetchSignal?.aborted).toBe(false);

    await act(async () => {
      resolveInitial({
        id: 'resource-a',
        content: 'stale body',
      } as Resource);
      resolveRefetch({
        id: 'resource-a',
        content: 'latest body',
      } as Resource);
    });

    expect(
      container
        .querySelector('[data-testid="resource-state"]')
        ?.getAttribute('data-content')
    ).toBe('latest body');
    expect(
      container
        .querySelector('[data-testid="resource-state"]')
        ?.getAttribute('data-loading')
    ).toBe('false');
  });

  it('revalidates access when the window regains focus', async () => {
    mockedGet
      .mockResolvedValueOnce({
        id: 'resource-a',
        content: 'initial body',
      } as Resource)
      .mockRejectedValueOnce({ response: { status: 403 } });

    await act(async () => root.render(<ResourceHarness />));
    await act(async () => window.dispatchEvent(new Event('focus')));

    const state = container.querySelector('[data-testid="resource-state"]');
    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(state?.getAttribute('data-forbidden')).toBe('true');
    expect(state?.getAttribute('data-content')).toBe('');
  });
});
