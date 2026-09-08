/** @jest-environment jsdom */

import { TextDecoder, TextEncoder } from 'util';

class RequestPolyfill {
  url: string;
  method: string;
  headers = { get: () => null };
  signal = { aborted: false };

  constructor(
    input: string | URL | RequestPolyfill,
    init?: { method?: string; signal?: { aborted: boolean } }
  ) {
    this.url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    this.method = init?.method ?? 'GET';
    this.signal = init?.signal ?? { aborted: false };
  }
}

// jsdom ships without the web encoding / fetch globals react-router expects.
Object.assign(globalThis, {
  TextEncoder,
  TextDecoder,
  Request: RequestPolyfill,
});

import { act, useEffect } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';

import { lazyRoute } from './lazyRoute';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function Parent({ onMount }: { onMount: () => void }) {
  useEffect(() => {
    onMount();
  }, [onMount]);

  return (
    <div data-testid="parent">
      <Outlet />
    </div>
  );
}

describe('lazyRoute', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('unwraps a default export as the route Component', async () => {
    function Page() {
      return null;
    }

    await expect(lazyRoute(async () => ({ default: Page }))()).resolves.toEqual(
      { Component: Page }
    );
  });

  it('does not remount the parent layout when opening a lazy resource route', async () => {
    const onMount = jest.fn();
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <Parent onMount={onMount} />,
          children: [
            { index: true, element: <div data-testid="chat">chat</div> },
            {
              path: 'resource',
              lazy: lazyRoute(async () => {
                await Promise.resolve();
                return {
                  default: function Resource() {
                    return <div data-testid="resource">resource</div>;
                  },
                };
              }),
            },
          ],
        },
      ],
      { initialEntries: ['/'] }
    );

    await act(async () => {
      root.render(<RouterProvider router={router} />);
    });

    expect(container.querySelector('[data-testid="chat"]')).not.toBeNull();
    expect(onMount).toHaveBeenCalledTimes(1);

    await act(async () => {
      await router.navigate('/resource');
    });

    expect(onMount).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="parent"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="resource"]')).not.toBeNull();
  });
});
