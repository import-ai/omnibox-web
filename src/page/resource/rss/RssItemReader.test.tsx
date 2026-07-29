/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

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

  async function renderReader() {
    await act(async () => {
      root.render(
        <RssItemReader
          namespaceId="namespace-1"
          resourceId="folder-1"
          itemId="item-1"
        />
      );
    });
  }

  it('renders parsed Markdown and keeps an original-source action', async () => {
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

    await renderReader();

    expect(container.textContent).toContain('Article');
    expect(container.textContent).toContain('# Parsed article');
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
