/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { Resource } from '@/interface';
import { http } from '@/lib/request';

import CitationResourcePreview from './CitationResourcePreview';

const mockApp = {
  fire: jest.fn(),
  on: jest.fn(() => jest.fn()),
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
      data-error={String(error)}
      data-forbidden={String(forbidden)}
      data-loading={String(loading)}
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
});
