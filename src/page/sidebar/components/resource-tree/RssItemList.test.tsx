/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { fetchRssItem, fetchRssItems } from '@/service/resource';

import RssItemList from './RssItemList';

const navigate = jest.fn();
const mockRouterState = {
  location: { state: undefined as { fromSidebar?: boolean } | undefined },
  params: {} as { resource_id?: string; rss_item_id?: string },
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useLocation: () => mockRouterState.location,
  useNavigate: () => navigate,
  useParams: () => mockRouterState.params,
}));
jest.mock('@/components/ResourceTypeIcon', () => () => null);
jest.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
  TooltipContent: ({ children }: { children: React.ReactNode }) => children,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/components/ui/Sidebar', () => ({
  SidebarMenuButton: ({
    children,
    onClick,
  }: React.ComponentProps<'button'>) => (
    <button onClick={onClick}>{children}</button>
  ),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => ({ on: () => jest.fn() }),
}));
jest.mock('@/service/resource', () => ({
  fetchRssItem: jest.fn(),
  fetchRssItems: jest.fn(),
}));

const mockedFetchRssItem = jest.mocked(fetchRssItem);
const mockedFetchRssItems = jest.mocked(fetchRssItems);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('RssItemList', () => {
  let container: HTMLDivElement;
  let root: Root;
  let scrollIntoView: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouterState.location = { state: undefined };
    mockRouterState.params = {};
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    scrollIntoView = jest.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    mockedFetchRssItems.mockResolvedValue([
      {
        id: 'item-1',
        link_id: 'link-1',
        link_name: 'Example',
        title: 'Article',
        url: 'https://example.com/article',
        summary: null,
        published_at: null,
        created_at: '2026-08-04T00:00:00Z',
      },
    ]);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.restoreAllMocks();
  });

  it('marks item navigation as originating from the sidebar', async () => {
    await act(async () => {
      root.render(
        <RssItemList folderId="folder-1" namespaceId="namespace-1" depth={1} />
      );
    });

    await act(async () => {
      container.querySelector('button')?.click();
    });

    expect(navigate).toHaveBeenCalledWith(
      '/namespace-1/folder-1/rss-items/item-1',
      { state: { fromSidebar: true } }
    );
  });

  it('scrolls the active item into view after a direct page load', async () => {
    mockRouterState.params = {
      resource_id: 'folder-1',
      rss_item_id: 'item-1',
    };

    await act(async () => {
      root.render(
        <RssItemList folderId="folder-1" namespaceId="namespace-1" depth={1} />
      );
    });

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
  });

  it('does not scroll when the item was opened from the sidebar', async () => {
    mockRouterState.location = { state: { fromSidebar: true } };
    mockRouterState.params = {
      resource_id: 'folder-1',
      rss_item_id: 'item-1',
    };

    await act(async () => {
      root.render(
        <RssItemList folderId="folder-1" namespaceId="namespace-1" depth={1} />
      );
    });

    mockRouterState.location = { state: undefined };
    await act(async () => {
      root.render(
        <RssItemList folderId="folder-1" namespaceId="namespace-1" depth={1} />
      );
    });

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('loads and scrolls to an active item outside the initial list', async () => {
    mockRouterState.params = {
      resource_id: 'folder-1',
      rss_item_id: 'item-51',
    };
    mockedFetchRssItem.mockResolvedValue({
      id: 'item-51',
      link_id: 'link-1',
      link_name: 'Example',
      title: 'Older article',
      url: 'https://example.com/older-article',
      summary: null,
      published_at: null,
      created_at: '2026-08-03T00:00:00Z',
      parsed_content: null,
    });

    await act(async () => {
      root.render(
        <RssItemList folderId="folder-1" namespaceId="namespace-1" depth={1} />
      );
    });

    expect(mockedFetchRssItem).toHaveBeenCalledWith(
      'namespace-1',
      'folder-1',
      'item-51',
      expect.any(AbortSignal)
    );
    expect(
      container.querySelector('[data-rss-item-id="item-51"]')
    ).not.toBeNull();
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
  });

  it('does not load an active item for another rss folder', async () => {
    mockRouterState.params = {
      resource_id: 'folder-2',
      rss_item_id: 'item-51',
    };

    await act(async () => {
      root.render(
        <RssItemList folderId="folder-1" namespaceId="namespace-1" depth={1} />
      );
    });

    expect(mockedFetchRssItem).not.toHaveBeenCalled();
  });
});
