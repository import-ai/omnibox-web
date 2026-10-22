/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import useNamespaceList from './useNamespaceList';

const mockGet = jest.fn();
const mockOn = jest.fn();
const mockUnsubscribe = jest.fn();
const mockApp = { on: mockOn };

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => mockApp,
}));
jest.mock('@/lib/request', () => ({
  http: { get: (...args: unknown[]) => mockGet(...args) },
}));

function Probe({
  endpoint,
  disabled = false,
}: {
  endpoint: string;
  disabled?: boolean;
}) {
  const { data, loading } = useNamespaceList(endpoint, disabled);
  return (
    <div data-loading={loading}>
      {data.map(namespace => namespace.name).join(',')}
    </div>
  );
}

describe('useNamespaceList', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    localStorage.setItem('uid', 'user-a');
    mockGet.mockReset();
    mockOn.mockReset().mockReturnValue(mockUnsubscribe);
    mockUnsubscribe.mockReset();
    mockGet.mockResolvedValue([{ id: 'space-a', name: 'Space A' }]);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    localStorage.clear();
    jest.useRealTimers();
  });

  it('refreshes the namespace list when the page regains focus', async () => {
    await act(async () => root.render(<Probe endpoint="namespaces" />));
    await act(async () => undefined);
    expect(mockGet).toHaveBeenCalledTimes(1);

    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockGet).toHaveBeenLastCalledWith('namespaces', expect.anything());
  });

  it('uses the commercial endpoint for Pro namespace lists', async () => {
    await act(async () => root.render(<Probe endpoint="pro-namespaces" />));
    await act(async () => undefined);
    expect(mockGet).toHaveBeenCalledWith('pro-namespaces', expect.anything());
  });

  it('updates a renamed space by polling and pauses while hidden', async () => {
    await act(async () => root.render(<Probe endpoint="namespaces" />));
    expect(container.textContent).toBe('Space A');
    mockGet.mockResolvedValue([{ id: 'space-a', name: 'Renamed Space' }]);

    await act(async () => jest.advanceTimersByTime(10_000));
    expect(container.textContent).toBe('Renamed Space');

    Object.defineProperty(document, 'visibilityState', { value: 'hidden' });
    await act(async () => jest.advanceTimersByTime(20_000));
    expect(mockGet).toHaveBeenCalledTimes(2);

    Object.defineProperty(document, 'visibilityState', { value: 'visible' });
    await act(async () =>
      document.dispatchEvent(new Event('visibilitychange'))
    );
    expect(mockGet).toHaveBeenCalledTimes(3);
  });

  it('lets slow requests finish and coalesces pending refreshes', async () => {
    let resolveRequest!: (value: unknown[]) => void;
    mockGet.mockReturnValueOnce(
      new Promise(resolve => {
        resolveRequest = resolve;
      })
    );
    await act(async () => root.render(<Probe endpoint="namespaces" />));
    const token = mockGet.mock.calls[0][1].cancelToken;

    await act(async () => jest.advanceTimersByTime(30_000));
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(token.reason).toBeUndefined();

    await act(async () =>
      resolveRequest([{ id: 'space-a', name: 'Old Name' }])
    );
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(container.textContent).toBe('Space A');
    expect(container.firstElementChild?.getAttribute('data-loading')).toBe(
      'false'
    );
  });

  it('ignores stale responses when switching endpoints and cleans up on disable', async () => {
    let resolveOldRequest!: (value: unknown[]) => void;
    mockGet.mockReturnValueOnce(
      new Promise(resolve => {
        resolveOldRequest = resolve;
      })
    );
    await act(async () => root.render(<Probe endpoint="namespaces" />));
    const token = mockGet.mock.calls[0][1].cancelToken;
    await act(async () => root.render(<Probe endpoint="pro-namespaces" />));
    expect(token.reason).toBeDefined();
    await act(async () => resolveOldRequest([{ id: 'old', name: 'Stale' }]));
    expect(container.textContent).toBe('Space A');

    await act(async () =>
      root.render(<Probe endpoint="pro-namespaces" disabled />)
    );
    await act(async () => {
      jest.advanceTimersByTime(20_000);
      window.dispatchEvent(new Event('focus'));
    });
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
  });

  it('does not request namespaces without a signed-in user', async () => {
    localStorage.removeItem('uid');
    await act(async () => root.render(<Probe endpoint="namespaces" />));
    await act(async () => jest.advanceTimersByTime(10_000));
    expect(mockGet).not.toHaveBeenCalled();
  });
});
