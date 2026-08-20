/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';

import { RssItemFeedBadge } from './RssItemFeedBadge';
import {
  clearRssFolderLinkNamesCache,
  invalidateRssFolderLinkNames,
  useRssItemFeedName,
} from './useRssFolderLinkNames';

jest.mock('@/lib/request', () => ({
  http: { get: jest.fn() },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mockGet = http.get as jest.Mock;

const FEED_A = 'link-a';
const FEED_B = 'link-b';

function configResponse(links: Array<{ id: string; name: string }>) {
  return {
    resource: { id: 'folder-1', name: 'Feeds' },
    links: links.map((link, index) => ({
      ...link,
      index,
      url: `https://example.com/${link.id}`,
    })),
  };
}

// Stands in for a sidebar item row: one component per item, each asking for the
// feed name of its own `attrs.link_id`.
function ItemRow({
  namespaceId = 'ns-1',
  folderId = 'folder-1',
  resourceType = 'rss_item',
  attrs,
}: {
  namespaceId?: string;
  folderId?: string | null;
  resourceType?: string;
  attrs?: Record<string, unknown>;
}) {
  const name = useRssItemFeedName(namespaceId, {
    resourceType,
    folderId,
    attrs,
  });
  return (
    <RssItemFeedBadge
      name={name}
      size="sidebar"
      fallback={<span data-testid="resource-icon" />}
    />
  );
}

describe('rss folder feed names', () => {
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
  });

  async function render(children: React.ReactNode) {
    await act(async () => {
      root.render(<>{children}</>);
    });
  }

  function badges() {
    return Array.from(
      container.querySelectorAll('[data-testid="rss-feed-badge"]')
    ).map(node => node.textContent);
  }

  it('renders the uppercased initial of the item feed name', async () => {
    mockGet.mockResolvedValue(
      configResponse([{ id: FEED_A, name: 'hacker news' }])
    );

    await render(<ItemRow attrs={{ link_id: FEED_A }} />);

    expect(badges()).toEqual(['H']);
    expect(container.querySelector('[data-testid="resource-icon"]')).toBeNull();
    expect(mockGet).toHaveBeenCalledWith(
      '/namespaces/ns-1/rss-folders/folder-1/config',
      { mute: true }
    );
  });

  it('gives items of different feeds their own initial', async () => {
    mockGet.mockResolvedValue(
      configResponse([
        { id: FEED_A, name: 'Alpha Weekly' },
        { id: FEED_B, name: 'beta digest' },
      ])
    );

    await render(
      <>
        <ItemRow attrs={{ link_id: FEED_A }} />
        <ItemRow attrs={{ link_id: FEED_B }} />
      </>
    );

    expect(badges()).toEqual(['A', 'B']);
  });

  it('fetches the config once per folder, not once per item', async () => {
    mockGet.mockResolvedValue(
      configResponse([{ id: FEED_A, name: 'Alpha Weekly' }])
    );

    await render(
      <>
        {Array.from({ length: 25 }, (_, index) => (
          <ItemRow key={index} attrs={{ link_id: FEED_A }} />
        ))}
      </>
    );

    expect(badges()).toHaveLength(25);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('fetches once per folder when two folders are on screen', async () => {
    mockGet.mockResolvedValue(
      configResponse([{ id: FEED_A, name: 'Alpha Weekly' }])
    );

    await render(
      <>
        <ItemRow folderId="folder-1" attrs={{ link_id: FEED_A }} />
        <ItemRow folderId="folder-1" attrs={{ link_id: FEED_A }} />
        <ItemRow folderId="folder-2" attrs={{ link_id: FEED_A }} />
      </>
    );

    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('refetches a folder after its config is saved', async () => {
    mockGet.mockResolvedValue(
      configResponse([{ id: FEED_A, name: 'Alpha Weekly' }])
    );
    await render(<ItemRow attrs={{ link_id: FEED_A }} />);
    expect(mockGet).toHaveBeenCalledTimes(1);

    mockGet.mockResolvedValue(
      configResponse([{ id: FEED_A, name: 'Renamed Feed' }])
    );
    // The row stays mounted: saving the config must refresh what it shows.
    await act(async () => {
      invalidateRssFolderLinkNames('ns-1', 'folder-1');
    });

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(badges()).toEqual(['R']);
  });

  it.each([
    ['a link that no longer resolves', { link_id: 'retired-link' }],
    ['an item with no link id', {}],
  ])('falls back to the resource icon for %s', async (_label, attrs) => {
    mockGet.mockResolvedValue(
      configResponse([{ id: FEED_A, name: 'Alpha Weekly' }])
    );

    await render(<ItemRow attrs={attrs} />);

    expect(badges()).toEqual([]);
    expect(
      container.querySelector('[data-testid="resource-icon"]')
    ).not.toBeNull();
  });

  it.each([
    ['an empty feed name', ''],
    ['a blank feed name', '   '],
  ])('falls back to the resource icon for %s', async (_label, name) => {
    mockGet.mockResolvedValue(configResponse([{ id: FEED_A, name }]));

    await render(<ItemRow attrs={{ link_id: FEED_A }} />);

    expect(badges()).toEqual([]);
    expect(
      container.querySelector('[data-testid="resource-icon"]')
    ).not.toBeNull();
  });

  // charAt(0) would hand back half of a surrogate pair.
  it('keeps an astral first character whole', async () => {
    mockGet.mockResolvedValue(
      configResponse([{ id: FEED_A, name: '🚀 Daily Rocket' }])
    );

    await render(<ItemRow attrs={{ link_id: FEED_A }} />);

    expect(badges()).toEqual(['🚀']);
  });

  function httpError(status: number) {
    return Object.assign(new Error(`request failed with ${status}`), {
      response: { status },
    });
  }

  it('falls back to the resource icon when the config cannot be read', async () => {
    mockGet.mockRejectedValue(httpError(403));

    await render(
      <>
        <ItemRow attrs={{ link_id: FEED_A }} />
        <ItemRow attrs={{ link_id: FEED_A }} />
      </>
    );

    expect(badges()).toEqual([]);
    expect(
      container.querySelectorAll('[data-testid="resource-icon"]')
    ).toHaveLength(2);
    // Rows in flight together share the one request whatever it answers.
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  // A refusal is the folder's settled answer: there is nothing to retry.
  it.each([[401], [403], [404]])(
    'does not ask again after a %i',
    async status => {
      mockGet.mockRejectedValue(httpError(status));
      await render(<ItemRow key="first" attrs={{ link_id: FEED_A }} />);
      expect(mockGet).toHaveBeenCalledTimes(1);

      mockGet.mockResolvedValue(
        configResponse([{ id: FEED_A, name: 'Alpha Weekly' }])
      );
      // A fresh row, as after navigating away and back.
      await render(<ItemRow key="second" attrs={{ link_id: FEED_A }} />);

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(badges()).toEqual([]);
    }
  );

  // A blip is about the attempt, not the folder. Memoising the empty result
  // left every badge in the session missing until a hard reload.
  it.each([
    ['a gateway failure', httpError(502)],
    ['a server error', httpError(500)],
    ['an offline request', new Error('Network Error')],
  ])('retries after %s on the next mount', async (_label, error) => {
    mockGet.mockRejectedValue(error);
    await render(<ItemRow key="first" attrs={{ link_id: FEED_A }} />);
    expect(badges()).toEqual([]);
    expect(mockGet).toHaveBeenCalledTimes(1);

    mockGet.mockResolvedValue(
      configResponse([{ id: FEED_A, name: 'Alpha Weekly' }])
    );
    // Navigating away and back, scrolling the row back into view, re-expanding
    // the folder: a fresh row asks again rather than reusing the failure.
    await render(<ItemRow key="second" attrs={{ link_id: FEED_A }} />);

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(badges()).toEqual(['A']);
  });

  it('does not ask for a config for a non-rss row or outside a namespace', async () => {
    mockGet.mockResolvedValue(
      configResponse([{ id: FEED_A, name: 'Alpha Weekly' }])
    );

    await render(
      <>
        <ItemRow resourceType="file" attrs={{ link_id: FEED_A }} />
        <ItemRow namespaceId="" attrs={{ link_id: FEED_A }} />
        <ItemRow folderId={null} attrs={{ link_id: FEED_A }} />
      </>
    );

    expect(mockGet).not.toHaveBeenCalled();
    expect(badges()).toEqual([]);
  });
});
