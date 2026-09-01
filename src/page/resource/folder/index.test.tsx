/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';
import { clearRssFolderLinkNamesCache } from '@/page/sidebar/components/rss-folder/useRssFolderLinkNames';

import Folder from './index';

jest.mock('@/lib/request', () => ({
  http: { get: jest.fn() },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { t: (key: string) => key, language: 'en' },
  }),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));
jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => ({ on: () => () => {}, fire: jest.fn() }),
}));
jest.mock('@/assets/icons/ResourceIcon', () => ({
  __esModule: true,
  default: () => <svg data-testid="resource-icon" />,
}));
jest.mock('@/components/loading', () => ({
  __esModule: true,
  default: ({ label }: { label?: string }) => (
    <div data-testid="loading">{label}</div>
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mockGet = http.get as jest.Mock;

const NAMESPACE_ID = 'ns-1';
const FOLDER_ID = 'rss-folder-1';
const CONFIG_URL = `/namespaces/${NAMESPACE_ID}/rss-folders/${FOLDER_ID}/config`;
const FEED_A = 'link-a';
const FEED_B = 'link-b';

function rssItem(id: string, name: string, attrs: Record<string, unknown>) {
  return {
    id,
    name,
    resource_type: 'rss_item',
    attrs,
    content: '',
    has_children: false,
    created_at: '2026-05-04T09:08:07.000Z',
    updated_at: '2026-05-04T09:08:07.000Z',
  };
}

/**
 * Answers the children request with `items` and the rss config request with
 * `links`, whatever order the component asks in.
 */
function respondWith(
  items: unknown[],
  links: Array<{ id: string; name: string }>
) {
  mockGet.mockImplementation((url: string) => {
    if (url === CONFIG_URL) {
      return Promise.resolve({
        resource: { id: FOLDER_ID, name: 'Feeds' },
        links: links.map((link, index) => ({
          ...link,
          index,
          url: `https://example.com/${link.id}`,
        })),
      });
    }
    return Promise.resolve(items);
  });
}

describe('Folder rss item rows', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    clearRssFolderLinkNamesCache();
    mockGet.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  async function renderFolder(rssFeedNames = true, emptyText?: string) {
    await act(async () => {
      root.render(
        <Folder
          resourceId={FOLDER_ID}
          apiPrefix={`/namespaces/${NAMESPACE_ID}/resources`}
          namespaceId={NAMESPACE_ID}
          navigationPrefix={`/${NAMESPACE_ID}`}
          rssFeedNames={rssFeedNames}
          emptyText={emptyText}
        />
      );
    });
  }

  function badges() {
    return Array.from(
      container.querySelectorAll('[data-testid="rss-feed-badge"]')
    ).map(node => node.textContent);
  }

  function feedNames() {
    return Array.from(
      container.querySelectorAll('[data-testid="rss-feed-name"]')
    ).map(node => node.textContent);
  }

  function configRequests() {
    return mockGet.mock.calls.filter(([url]) => url === CONFIG_URL);
  }

  it('badges a row with its feed initial and names the feed after the date', async () => {
    respondWith(
      [rssItem('item-1', 'An article', { link_id: FEED_A })],
      [{ id: FEED_A, name: 'hacker news' }]
    );

    await renderFolder();

    expect(badges()).toEqual(['H']);
    expect(feedNames()).toEqual(['hacker news']);
    // The name follows the date inside the same meta line.
    expect(
      container.querySelector('[data-testid="rss-feed-name"]')?.parentElement
        ?.textContent
    ).toBe('2026-05-04 09:08:07hacker news');
    expect(container.querySelector('[data-testid="resource-icon"]')).toBeNull();
  });

  it('gives items of two feeds in one folder different initials', async () => {
    respondWith(
      [
        rssItem('item-1', 'From alpha', { link_id: FEED_A }),
        rssItem('item-2', 'From beta', { link_id: FEED_B }),
      ],
      [
        { id: FEED_A, name: 'Alpha Weekly' },
        { id: FEED_B, name: 'beta digest' },
      ]
    );

    await renderFolder();

    expect(badges()).toEqual(['A', 'B']);
    expect(feedNames()).toEqual(['Alpha Weekly', 'beta digest']);
  });

  it.each([
    ['a retired link', { link_id: 'gone' }, [{ id: FEED_A, name: 'Alpha' }]],
    ['no link id', {}, [{ id: FEED_A, name: 'Alpha' }]],
    ['an unnamed feed', { link_id: FEED_A }, [{ id: FEED_A, name: '' }]],
  ])(
    'falls back to the resource icon and shows no name for %s',
    async (_label, attrs, links) => {
      respondWith([rssItem('item-1', 'An article', attrs)], links);

      await renderFolder();

      expect(badges()).toEqual([]);
      expect(feedNames()).toEqual([]);
      expect(
        container.querySelector('[data-testid="resource-icon"]')
      ).not.toBeNull();
    }
  );

  it('reads the folder config once for the whole listing', async () => {
    respondWith(
      Array.from({ length: 10 }, (_, index) =>
        rssItem(`item-${index}`, `Article ${index}`, { link_id: FEED_A })
      ),
      [{ id: FEED_A, name: 'Alpha Weekly' }]
    );

    await renderFolder();

    expect(badges()).toHaveLength(10);
    expect(configRequests()).toHaveLength(1);
  });

  it('never asks for a config where feed names are not available', async () => {
    respondWith(
      [rssItem('item-1', 'An article', { link_id: FEED_A })],
      [{ id: FEED_A, name: 'Alpha Weekly' }]
    );

    await renderFolder(false);

    expect(configRequests()).toHaveLength(0);
    expect(badges()).toEqual([]);
    expect(feedNames()).toEqual([]);
    expect(
      container.querySelector('[data-testid="resource-icon"]')
    ).not.toBeNull();
  });

  it('keeps the empty state hidden until the initial sync settles', async () => {
    jest.useFakeTimers();
    let configCalls = 0;
    let childrenCalls = 0;
    mockGet.mockImplementation((url: string) => {
      if (url === CONFIG_URL) {
        configCalls += 1;
        return Promise.resolve({
          resource: { id: FOLDER_ID, name: 'Feeds' },
          links: [],
          initial_sync_status: configCalls === 1 ? 'pending' : 'succeeded',
        });
      }
      childrenCalls += 1;
      return Promise.resolve([]);
    });

    await renderFolder(true, 'rss_folder.empty');

    expect(container.textContent).toContain('rss_folder.loading');
    expect(container.textContent).not.toContain('rss_folder.empty');

    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });
    await act(async () => undefined);

    expect(container.textContent).not.toContain('rss_folder.loading');
    expect(container.textContent).toContain('rss_folder.empty');
    expect(childrenCalls).toBe(2);
  });

  it('refreshes children when a failed sync later succeeds', async () => {
    jest.useFakeTimers();
    let configCalls = 0;
    let childrenCalls = 0;
    mockGet.mockImplementation((url: string) => {
      if (url === CONFIG_URL) {
        configCalls += 1;
        return Promise.resolve({
          resource: { id: FOLDER_ID, name: 'Feeds' },
          links: [],
          initial_sync_status: configCalls === 1 ? 'failed' : 'succeeded',
        });
      }
      childrenCalls += 1;
      return Promise.resolve([]);
    });

    await renderFolder(true, 'rss_folder.empty');

    expect(container.textContent).toContain('rss_folder.load_failed');

    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    await act(async () => undefined);

    expect(container.textContent).toContain('rss_folder.empty');
    expect(childrenCalls).toBe(2);
  });
});
