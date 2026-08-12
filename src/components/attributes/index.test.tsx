/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { Resource } from '@/interface';

import Attributes from './index';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/components/tags', () => ({
  __esModule: true,
  default: () => <div data-testid="tags" />,
}));
jest.mock('./resource-tasks', () => ({
  __esModule: true,
  default: () => <div data-testid="resource-tasks" />,
}));
jest.mock('@/components/attributes/FilenameAttribute', () => ({
  FilenameAttribute: () => <div data-testid="filename" />,
}));
jest.mock('@/components/attributes/Metadata', () => ({
  Metadata: () => <div data-testid="metadata" />,
}));
jest.mock('@/components/attributes/CreatedTimeAttribute', () => ({
  CreatedTimeAttribute: () => <div data-testid="created-time" />,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function rssItem(attrs: Record<string, unknown>): Resource {
  return {
    id: 'item-1',
    name: 'Article',
    parent_id: 'rss-folder',
    resource_type: 'rss_item',
    space_type: 'private',
    has_children: false,
    read_only: true,
    created_at: '2026-01-02T03:04:05Z',
    attrs,
  } as unknown as Resource;
}

describe('Attributes', () => {
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

  it('shows the article url and published time of an rss item', async () => {
    await act(async () => {
      root.render(
        <Attributes
          namespaceId="namespace-1"
          resource={rssItem({
            url: 'https://example.com/feed.xml',
            article_url: 'https://example.com/article',
            published_at: '2026-01-01T00:00:00Z',
          })}
        />
      );
    });

    const link = container.querySelector('a');
    // The article's own url wins over the feed url it came from.
    expect(link?.getAttribute('href')).toBe('https://example.com/article');
    expect(container.textContent).toContain('rss_folder.reader.published_at');
    // Read-only resources never expose tag editing or task retries.
    expect(container.querySelector('[data-testid="tags"]')).toBeNull();
    expect(
      container.querySelector('[data-testid="resource-tasks"]')
    ).toBeNull();
  });

  it('falls back to the feed url when the entry has no article url', async () => {
    await act(async () => {
      root.render(
        <Attributes
          namespaceId="namespace-1"
          resource={rssItem({ url: 'https://example.com/feed.xml' })}
        />
      );
    });

    expect(container.querySelector('a')?.getAttribute('href')).toBe(
      'https://example.com/feed.xml'
    );
  });

  it('renders nothing for an rss item without feed metadata', async () => {
    await act(async () => {
      root.render(
        <Attributes namespaceId="namespace-1" resource={rssItem({})} />
      );
    });

    expect(container.textContent).toBe('');
  });
});
