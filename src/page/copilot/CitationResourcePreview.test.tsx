/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { Resource } from '@/interface';
import { http } from '@/lib/request';

import CitationResourcePreview from './CitationResourcePreview';

const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

const mockApp = {
  fire: jest.fn(),
  on: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
    listeners[event] = listeners[event] || [];
    listeners[event].push(cb);
    return () => {
      listeners[event] = (listeners[event] || []).filter(
        listener => listener !== cb
      );
    };
  }),
};

jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => mockApp,
}));
jest.mock('@/lib/request', () => ({
  http: { get: jest.fn() },
}));
jest.mock('@/page/resource/ResourceDetailView', () => ({
  __esModule: true,
  default: ({
    error,
    forbidden,
    loading,
    notFound,
    resource,
  }: {
    error: boolean;
    forbidden: boolean;
    loading: boolean;
    notFound: boolean;
    resource: Resource | null;
  }) => (
    <div
      data-content={resource?.content ?? ''}
      data-error={String(error)}
      data-forbidden={String(forbidden)}
      data-loading={String(loading)}
      data-name={resource?.name ?? ''}
      data-not-found={String(notFound)}
      data-resource-id={resource?.id ?? 'none'}
      data-testid="resource-detail-view"
    />
  ),
}));

const mockedGet = jest.mocked(http.get);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('CitationResourcePreview', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    Object.keys(listeners).forEach(key => {
      delete listeners[key];
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.clearAllMocks();
  });

  it('keeps the shared resource loading state while the request is pending', async () => {
    mockedGet.mockReturnValue(new Promise(() => undefined));

    await act(async () => {
      root.render(
        <CitationResourcePreview
          namespaceId="namespace-a"
          resourceId="resource-a"
        />
      );
    });

    const view = container.querySelector(
      '[data-testid="resource-detail-view"]'
    );
    expect(view?.getAttribute('data-loading')).toBe('true');
  });

  it('loads a cited resource into the shared detail view', async () => {
    const resource = {
      id: 'resource-a',
      name: 'Resource A',
      resource_type: 'resource',
    } as Resource;
    mockedGet.mockResolvedValue(resource);

    await act(async () => {
      root.render(
        <CitationResourcePreview
          flush
          namespaceId="namespace-a"
          resourceId="resource-a"
        />
      );
    });

    const view = container.querySelector(
      '[data-testid="resource-detail-view"]'
    );
    expect(view?.getAttribute('data-resource-id')).toBe('resource-a');
    expect(view?.getAttribute('data-loading')).toBe('false');
    expect(view?.getAttribute('data-forbidden')).toBe('false');
    expect(view?.getAttribute('data-not-found')).toBe('false');
  });

  it('returns to loading without showing the previous resource after the id changes', async () => {
    mockedGet
      .mockResolvedValueOnce({
        id: 'resource-a',
        name: 'Resource A',
        resource_type: 'resource',
      } as Resource)
      .mockReturnValueOnce(new Promise(() => undefined));

    await act(async () => {
      root.render(
        <CitationResourcePreview
          namespaceId="namespace-a"
          resourceId="resource-a"
        />
      );
    });
    await act(async () => {
      root.render(
        <CitationResourcePreview
          namespaceId="namespace-a"
          resourceId="resource-b"
        />
      );
    });

    const view = container.querySelector(
      '[data-testid="resource-detail-view"]'
    );
    expect(view?.getAttribute('data-resource-id')).toBe('none');
    expect(view?.getAttribute('data-loading')).toBe('true');
  });

  it.each([
    ['404 responses', { response: { status: 404 } }, 'false', 'true'],
    [
      'not-authorized responses',
      { response: { data: { code: 'not_authorized' }, status: 403 } },
      'true',
      'false',
    ],
  ])(
    'maps %s to the formal resource state',
    async (_, error, forbidden, notFound) => {
      mockedGet.mockRejectedValue(error);

      await act(async () => {
        root.render(
          <CitationResourcePreview
            namespaceId="namespace-a"
            resourceId="resource-a"
          />
        );
      });

      const view = container.querySelector(
        '[data-testid="resource-detail-view"]'
      );
      expect(view?.getAttribute('data-loading')).toBe('false');
      expect(view?.getAttribute('data-forbidden')).toBe(forbidden);
      expect(view?.getAttribute('data-not-found')).toBe(notFound);
    }
  );

  it('renders the shared error state for other request failures', async () => {
    mockedGet.mockRejectedValue(new Error('network unavailable'));

    await act(async () => {
      root.render(
        <CitationResourcePreview
          namespaceId="namespace-a"
          resourceId="resource-a"
        />
      );
    });

    const view = container.querySelector(
      '[data-testid="resource-detail-view"]'
    );
    expect(view?.getAttribute('data-loading')).toBe('false');
    expect(view?.getAttribute('data-error')).toBe('true');
    expect(view?.getAttribute('data-resource-id')).toBe('none');
  });

  function fireApp(event: string, ...args: unknown[]) {
    for (const listener of listeners[event] || []) {
      listener(...args);
    }
  }

  it.each(['update_resource', 'refresh_resource'])(
    'refetches the cited resource when %s announces it by id',
    async event => {
      mockedGet
        .mockResolvedValueOnce({
          id: 'resource-a',
          name: 'Resource A',
          content: 'old body',
          resource_type: 'resource',
        } as Resource)
        .mockResolvedValueOnce({
          id: 'resource-a',
          name: 'Resource A',
          content: 'new body',
          resource_type: 'resource',
        } as Resource);

      await act(async () => {
        root.render(
          <CitationResourcePreview
            namespaceId="namespace-a"
            resourceId="resource-a"
          />
        );
      });

      expect(
        container
          .querySelector('[data-testid="resource-detail-view"]')
          ?.getAttribute('data-content')
      ).toBe('old body');

      await act(async () => {
        fireApp(event, 'resource-a');
      });

      const view = container.querySelector(
        '[data-testid="resource-detail-view"]'
      );
      expect(mockedGet).toHaveBeenCalledTimes(2);
      expect(view?.getAttribute('data-content')).toBe('new body');
      expect(view?.getAttribute('data-loading')).toBe('false');
    }
  );

  it('merges object deltas without refetching', async () => {
    mockedGet.mockResolvedValue({
      id: 'resource-a',
      name: 'Resource A',
      content: 'old body',
      resource_type: 'resource',
    } as Resource);

    await act(async () => {
      root.render(
        <CitationResourcePreview
          namespaceId="namespace-a"
          resourceId="resource-a"
        />
      );
    });

    await act(async () => {
      fireApp('update_resource', {
        id: 'resource-a',
        name: 'Resource A renamed',
      });
    });

    const view = container.querySelector(
      '[data-testid="resource-detail-view"]'
    );
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(view?.getAttribute('data-name')).toBe('Resource A renamed');
    expect(view?.getAttribute('data-content')).toBe('old body');
  });

  it('ignores id announcements for a different resource', async () => {
    mockedGet.mockResolvedValue({
      id: 'resource-a',
      name: 'Resource A',
      content: 'old body',
      resource_type: 'resource',
    } as Resource);

    await act(async () => {
      root.render(
        <CitationResourcePreview
          namespaceId="namespace-a"
          resourceId="resource-a"
        />
      );
    });

    await act(async () => {
      fireApp('update_resource', 'resource-b');
    });

    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(
      container
        .querySelector('[data-testid="resource-detail-view"]')
        ?.getAttribute('data-content')
    ).toBe('old body');
  });

  it('shows not found when copilot deletes the cited resource', async () => {
    mockedGet.mockResolvedValue({
      id: 'resource-a',
      name: 'Resource A',
      content: 'old body',
      resource_type: 'resource',
    } as Resource);

    await act(async () => {
      root.render(
        <CitationResourcePreview
          namespaceId="namespace-a"
          resourceId="resource-a"
        />
      );
    });

    await act(async () => {
      fireApp('delete_resource', 'resource-a');
    });

    const view = container.querySelector(
      '[data-testid="resource-detail-view"]'
    );
    expect(view?.getAttribute('data-not-found')).toBe('true');
    expect(view?.getAttribute('data-resource-id')).toBe('none');
    expect(view?.getAttribute('data-content')).toBe('');
  });

  it('refetches emptied content without leaving the previous body on screen', async () => {
    mockedGet
      .mockResolvedValueOnce({
        id: 'resource-a',
        name: 'Resource A',
        content: 'old body',
        resource_type: 'resource',
      } as Resource)
      .mockResolvedValueOnce({
        id: 'resource-a',
        name: 'Resource A',
        content: '',
        resource_type: 'resource',
      } as Resource);

    await act(async () => {
      root.render(
        <CitationResourcePreview
          namespaceId="namespace-a"
          resourceId="resource-a"
        />
      );
    });

    await act(async () => {
      fireApp('update_resource', 'resource-a');
    });

    expect(
      container
        .querySelector('[data-testid="resource-detail-view"]')
        ?.getAttribute('data-content')
    ).toBe('');
  });

  it('does not restore content from a refetch that finishes after delete', async () => {
    let resolveRefetch: (resource: Resource) => void = () => undefined;
    mockedGet
      .mockResolvedValueOnce({
        id: 'resource-a',
        name: 'Resource A',
        content: 'old body',
        resource_type: 'resource',
      } as Resource)
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolveRefetch = resolve;
        })
      );

    await act(async () => {
      root.render(
        <CitationResourcePreview
          namespaceId="namespace-a"
          resourceId="resource-a"
        />
      );
    });

    await act(async () => {
      fireApp('update_resource', 'resource-a');
    });
    await act(async () => {
      fireApp('delete_resource', 'resource-a');
    });

    expect(
      container
        .querySelector('[data-testid="resource-detail-view"]')
        ?.getAttribute('data-not-found')
    ).toBe('true');

    await act(async () => {
      resolveRefetch({
        id: 'resource-a',
        name: 'Resource A',
        content: 'stale body',
        resource_type: 'resource',
      } as Resource);
    });

    const view = container.querySelector(
      '[data-testid="resource-detail-view"]'
    );
    expect(view?.getAttribute('data-not-found')).toBe('true');
    expect(view?.getAttribute('data-content')).toBe('');
  });
});
