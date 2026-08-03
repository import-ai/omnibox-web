/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { RssItemDetail } from '@/interface';
import { fetchRssItem } from '@/service/resource';

import RssItemReader from './RssItemReader';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));
jest.mock('@/components/markdown', () => ({
  Markdown: ({ content }: { content: string }) => (
    <div data-testid="markdown">{content}</div>
  ),
}));
jest.mock('@/service/resource', () => ({
  fetchRssItem: jest.fn(),
}));

const mockedFetchRssItem = jest.mocked(fetchRssItem);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('RssItemReader', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  async function renderReader(onCopyContentChange?: jest.Mock) {
    await act(async () => {
      root.render(
        <RssItemReader
          namespaceId="namespace-1"
          resourceId="folder-1"
          itemId="item-1"
          onCopyContentChange={onCopyContentChange}
        />
      );
    });
  }

  it('renders parsed Markdown and keeps an original-source action', async () => {
    const onCopyContentChange = jest.fn();
    mockedFetchRssItem.mockResolvedValue({
      id: 'item-1',
      link_id: 'link-1',
      link_name: 'Example',
      title: 'Article',
      url: 'https://example.com/article',
      summary: null,
      published_at: null,
      created_at: '2026-07-28T00:00:00Z',
      parsed_content: '# Parsed article',
    });

    await renderReader(onCopyContentChange);

    expect(container.textContent).toContain('Article');
    expect(container.textContent).toContain('# Parsed article');
    expect(onCopyContentChange).toHaveBeenNthCalledWith(1, {
      itemId: 'item-1',
      content: undefined,
    });
    expect(onCopyContentChange).toHaveBeenLastCalledWith({
      itemId: 'item-1',
      content: '# Parsed article',
    });
    const sourceLink = container.querySelector(
      'a[href="https://example.com/article"]'
    );
    expect(sourceLink?.getAttribute('target')).toBe('_blank');
  });

  it('renders the link and published time when present', async () => {
    mockedFetchRssItem.mockResolvedValue({
      id: 'item-1',
      link_id: 'link-1',
      link_name: 'Example',
      title: 'Article',
      url: 'https://example.com/article',
      summary: null,
      published_at: '2026-07-22T00:09:09Z',
      created_at: '2026-07-28T00:00:00Z',
      parsed_content: '# Parsed article',
    });

    await renderReader();

    expect(container.textContent).toContain('resource.attrs.url');
    expect(container.textContent).toContain('rss_folder.reader.published_at');
    expect(container.textContent).toMatch(
      /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/
    );
  });

  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  function itemFixture(id: string, title: string): RssItemDetail {
    return {
      id,
      link_id: 'link-1',
      link_name: 'Example',
      title,
      url: 'https://example.com/article',
      summary: null,
      published_at: null,
      created_at: '2026-07-28T00:00:00Z',
      parsed_content: `# ${title}`,
    };
  }

  async function renderItem(itemId: string) {
    await act(async () => {
      root.render(
        <RssItemReader
          namespaceId="namespace-1"
          resourceId="folder-1"
          itemId={itemId}
        />
      );
    });
  }

  it('ignores a superseded response after switching items mid-request', async () => {
    const first = deferred<RssItemDetail>();
    const second = deferred<RssItemDetail>();
    mockedFetchRssItem
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    await renderItem('item-1');
    // Switch before item-1 resolves; its request is now stale.
    await renderItem('item-2');

    // item-1 resolves late: it must not render, and must not clear the loading
    // state that item-2's still-pending request owns.
    await act(async () => {
      first.resolve(itemFixture('item-1', 'Stale Article'));
    });
    expect(container.textContent).not.toContain('Stale Article');
    expect(container.querySelector('[data-testid="markdown"]')).toBeNull();

    // Only item-2's response drives the view.
    await act(async () => {
      second.resolve(itemFixture('item-2', 'Fresh Article'));
    });
    expect(container.textContent).toContain('Fresh Article');
    expect(container.textContent).not.toContain('Stale Article');
  });

  it('ignores a superseded rejection after switching items mid-request', async () => {
    const first = deferred<RssItemDetail>();
    const second = deferred<RssItemDetail>();
    mockedFetchRssItem
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    await renderItem('item-1');
    await renderItem('item-2');

    // The aborted/failed old request settling must not surface not-found or drop
    // the loading state for the current item.
    await act(async () => {
      first.reject({ response: { status: 404 } });
    });
    expect(container.textContent).not.toContain('rss_folder.reader.not_found');
    expect(container.querySelector('[data-testid="markdown"]')).toBeNull();

    await act(async () => {
      second.resolve(itemFixture('item-2', 'Fresh Article'));
    });
    expect(container.textContent).toContain('Fresh Article');
  });

  it('does not keep stale content when the request fails with a non-404 error', async () => {
    mockedFetchRssItem.mockResolvedValueOnce(
      itemFixture('item-1', 'First Article')
    );
    await renderItem('item-1');
    expect(container.textContent).toContain('First Article');

    // A 500 on the next item must clear the previous article rather than leave it
    // rendered.
    mockedFetchRssItem.mockRejectedValueOnce({ response: { status: 500 } });
    await renderItem('item-2');

    expect(container.textContent).not.toContain('First Article');
    expect(container.querySelector('[data-testid="markdown"]')).toBeNull();
    expect(container.textContent).toContain('rss_folder.reader.not_found');
  });

  it('shows the not-ready state while parsed content is null', async () => {
    mockedFetchRssItem.mockResolvedValue({
      id: 'item-1',
      link_id: 'link-1',
      link_name: null,
      title: 'Article',
      url: 'https://example.com/article',
      summary: null,
      published_at: null,
      created_at: '2026-07-28T00:00:00Z',
      parsed_content: null,
    });

    await renderReader();

    expect(container.textContent).toContain('rss_folder.reader.not_ready');
    expect(container.querySelector('[data-testid="markdown"]')).toBeNull();
  });
});
