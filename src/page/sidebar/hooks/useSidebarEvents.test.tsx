/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';
import { RssItemFeedBadge } from '@/page/sidebar/components/rss-folder/RssItemFeedBadge';
import {
  clearRssFolderLinkNamesCache,
  useRssItemFeedName,
} from '@/page/sidebar/components/rss-folder/useRssFolderLinkNames';

import { useSidebarEvents } from './useSidebarEvents';

const NAMESPACE_ID = 'ns-1';
const FOLDER_ID = 'rss-folder-1';
const FEED_A = 'link-a';

type AppHandler = (...args: any[]) => void;

/** The `on`/`fire` half of the app hub, which is all this adapter uses. */
const app = {
  handlers: new Map<string, Set<AppHandler>>(),
  on(event: string, handler: AppHandler) {
    const handlers = app.handlers.get(event) || new Set<AppHandler>();
    handlers.add(handler);
    app.handlers.set(event, handlers);
    return () => handlers.delete(handler);
  },
  fire(event: string, ...args: any[]) {
    for (const handler of app.handlers.get(event) || []) {
      handler(...args);
    }
  },
};
const mockSidebarState = {
  nodes: {} as Record<string, Record<string, unknown>>,
  ui: {} as Record<string, unknown>,
  patch: jest.fn(),
  refreshChildren: jest.fn(),
};

jest.mock('@/lib/request', () => ({
  http: { get: jest.fn() },
}));
jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => app,
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/', state: null }),
}));
jest.mock('@/components/sonner', () => ({
  showActionToast: jest.fn(),
}));
jest.mock('@/page/resource/resourceNavigation', () => ({
  navigateToResource: jest.fn(),
}));
jest.mock('@/page/sidebar/components/smart-folder', () => ({
  withSmartFolderChildSidebarAttrs: (resource: unknown) => resource,
}));
jest.mock('@/page/sidebar/store', () => ({
  useSidebarStore: Object.assign(
    (selector: (state: typeof mockSidebarState) => unknown) =>
      selector(mockSidebarState),
    { getState: () => mockSidebarState }
  ),
}));
jest.mock('@/page/sidebar/store/utils', () => ({
  getNodeChildrenParams: () => ({}),
  getNodeResourceSort: () => undefined,
}));
jest.mock('@/page/sidebar/utils', () => ({
  clearSidebarActiveKeyFromState: () => ({ changed: false, nextState: null }),
  locateSidebarResource: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/service/resource', () => ({
  fetchChildren: jest.fn().mockResolvedValue([]),
  fetchResource: jest.fn(),
  fetchSmartFolderChildren: jest.fn().mockResolvedValue([]),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mockGet = http.get as jest.Mock;

function configResponse(name: string) {
  return {
    resource: { id: FOLDER_ID, name: 'Feeds' },
    links: [{ id: FEED_A, index: 0, name, url: 'https://news.example.com' }],
  };
}

/** A sidebar row of an rss item, showing the feed it came from. */
function ItemRow() {
  const feedName = useRssItemFeedName(NAMESPACE_ID, {
    resourceType: 'rss_item',
    folderId: FOLDER_ID,
    attrs: { link_id: FEED_A },
  });
  return (
    <RssItemFeedBadge
      name={feedName}
      size="sidebar"
      fallback={<span data-testid="resource-icon" />}
    />
  );
}

function EventsProbe() {
  useSidebarEvents(NAMESPACE_ID);
  return null;
}

describe('useSidebarEvents rss folder updates', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    clearRssFolderLinkNamesCache();
    mockGet.mockReset();
    mockSidebarState.nodes = {};
    mockSidebarState.ui = {};
    mockSidebarState.patch.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  function badges() {
    return Array.from(
      container.querySelectorAll('[data-testid="rss-feed-badge"]')
    ).map(node => node.textContent);
  }

  async function renderRows() {
    await act(async () => {
      root.render(
        <>
          <EventsProbe />
          <ItemRow />
        </>
      );
    });
  }

  // Wizard's `update_rss_folder_config` renames a feed and reports it as a
  // `refresh_resource`, so this path — not the config dialog — is what "rename
  // the Hacker News feed to HN" in chat goes through.
  it('refreshes item feed names when an agent renames an rss folder', async () => {
    mockGet.mockResolvedValue(configResponse('Hacker News'));
    await renderRows();
    expect(badges()).toEqual(['H']);

    mockGet.mockResolvedValue(configResponse('Nightly Digest'));
    await act(async () => {
      app.fire('refresh_resource', {
        id: FOLDER_ID,
        name: 'HN',
        parent_id: null,
        resource_type: 'rss_folder',
      });
    });

    // The row stays mounted, so nothing refetches unless the update says so.
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(badges()).toEqual(['N']);
    expect(mockSidebarState.patch).toHaveBeenCalledWith(
      FOLDER_ID,
      expect.objectContaining({ name: 'HN' })
    );
  });

  it('leaves memoised feed names alone when another resource is updated', async () => {
    mockGet.mockResolvedValue(configResponse('Hacker News'));
    await renderRows();
    expect(badges()).toEqual(['H']);

    await act(async () => {
      app.fire('refresh_resource', {
        id: 'doc-1',
        name: 'A renamed doc',
        parent_id: null,
        resource_type: 'doc',
      });
    });

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(badges()).toEqual(['H']);
  });
});
