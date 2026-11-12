/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import useNamespaceMember from './useNamespaceMember';

const mockGet = jest.fn();
const mockOn = jest.fn();
const mockUnsubscribe = jest.fn();
const mockApp = { on: mockOn };

jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => mockApp,
}));
jest.mock('@/lib/request', () => ({
  http: { get: (...args: unknown[]) => mockGet(...args) },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function Probe({ namespaceId }: { namespaceId: string }) {
  const { data, loading } = useNamespaceMember({ namespaceId });
  return <div data-loading={loading}>{loading ? 'loading' : data.count}</div>;
}

describe('useNamespaceMember', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    mockGet.mockReset();
    mockOn.mockReset().mockReturnValue(mockUnsubscribe);
    mockUnsubscribe.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('loads the member count for the current namespace after switching', async () => {
    mockGet.mockImplementation((url: string) =>
      Promise.resolve({
        count: url.includes('/edge/') ? 3 : 15,
      })
    );

    await act(async () => root.render(<Probe namespaceId="edge" />));
    await act(async () => undefined);
    expect(container.textContent).toBe('3');

    await act(async () => root.render(<Probe namespaceId="pr-test" />));
    await act(async () => undefined);

    expect(container.textContent).toBe('15');
    expect(mockGet).toHaveBeenLastCalledWith(
      'namespaces/pr-test/members/count',
      expect.anything()
    );
  });

  it('ignores a stale response from the previous namespace', async () => {
    let resolveEdgeRequest!: (value: { count: number }) => void;
    mockGet
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveEdgeRequest = resolve;
          })
      )
      .mockResolvedValueOnce({ count: 15 });

    await act(async () => root.render(<Probe namespaceId="edge" />));
    await act(async () => root.render(<Probe namespaceId="pr-test" />));
    await act(async () => undefined);
    expect(container.textContent).toBe('15');

    await act(async () => resolveEdgeRequest({ count: 3 }));
    expect(container.textContent).toBe('15');
  });

  it('refreshes the current namespace on namespace refresh events', async () => {
    mockGet.mockImplementation((url: string) =>
      Promise.resolve({
        count: url.includes('/edge/') ? 3 : 16,
      })
    );

    await act(async () => root.render(<Probe namespaceId="edge" />));
    await act(async () => root.render(<Probe namespaceId="pr-test" />));
    await act(async () => undefined);
    expect(container.textContent).toBe('16');

    const refresh = mockOn.mock.calls.at(-1)?.[1] as (() => void) | undefined;
    expect(refresh).toBeDefined();

    await act(async () => refresh?.());
    await act(async () => undefined);

    expect(mockGet).toHaveBeenLastCalledWith(
      'namespaces/pr-test/members/count',
      expect.anything()
    );
    expect(container.textContent).toBe('16');
  });
});
