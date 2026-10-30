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
jest.mock('@/page/resource/useMentionUsers', () => ({
  useMentionUsers: (namespaceId?: string) => ({
    membersById:
      namespaceId &&
      (
        globalThis as {
          __mentionMembers?: Record<string, unknown>;
        }
      ).__mentionMembers
        ? (
            globalThis as {
              __mentionMembers: Record<string, unknown>;
            }
          ).__mentionMembers
        : {},
  }),
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

  it('shows the creator and collaborators under the created time for a document', async () => {
    await act(async () => {
      root.render(
        <Attributes
          namespaceId="namespace-1"
          resource={
            {
              id: 'doc-1',
              name: 'Notes',
              parent_id: 'team-root',
              resource_type: 'doc',
              space_type: 'teamspace',
              has_children: false,
              created_at: '2026-01-02T03:04:05Z',
              creator: {
                label: '荔枝（lizhi）',
                initial: '荔',
                tone: '1',
                interactive: true,
              },
              collaborators: [
                {
                  label: '一二三四五六七八九十一二三四五六七',
                  initial: '一',
                  tone: '2',
                  interactive: true,
                },
                {
                  label: 'Bob',
                  initial: 'B',
                  tone: '0',
                  interactive: false,
                },
              ],
            } as unknown as Resource
          }
        />
      );
    });

    expect(
      container.querySelector('[data-testid="created-time"]')
    ).not.toBeNull();
    const creator = container.querySelector('[data-testid="resource-creator"]');
    const collaborators = container.querySelector(
      '[data-testid="resource-collaborators"]'
    );
    expect(creator?.textContent).toContain('resource.attrs.creator');
    expect(creator?.textContent).toContain('荔枝（lizhi）');
    expect(collaborators?.textContent).toContain(
      'resource.attrs.collaborators'
    );
    expect(collaborators?.textContent).toContain(
      '一二三四五六七八九十一二三四五六…'
    );
    expect(collaborators?.textContent).toContain(
      'resource.attrs.contributor_separator'
    );
    expect(collaborators?.textContent).toContain('Bob');
    expect(container.querySelector('button')).toBeNull();
  });

  it('hides collaborator row when a document has only a creator', async () => {
    await act(async () => {
      root.render(
        <Attributes
          namespaceId="namespace-1"
          resource={
            {
              id: 'doc-1',
              name: 'Notes',
              parent_id: 'team-root',
              resource_type: 'doc',
              space_type: 'teamspace',
              has_children: false,
              creator: {
                label: 'Lizhi',
                initial: 'L',
                tone: '0',
                interactive: true,
              },
              collaborators: [],
            } as unknown as Resource
          }
        />
      );
    });

    expect(
      container.querySelector('[data-testid="resource-creator"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="resource-collaborators"]')
    ).toBeNull();
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
    expect(container.textContent).toContain('rss_folder.published_at');
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

  it('reuses the editor mention card only for an active member', async () => {
    (
      globalThis as {
        __mentionMembers?: Record<string, unknown>;
      }
    ).__mentionMembers = {
      'user-b': {
        id: 'user-b',
        username: 'bob',
        nickname: '鲍勃',
        email: 'b@qq.com',
      },
    };
    await act(async () => {
      root.render(
        <Attributes
          namespaceId="namespace-1"
          resource={
            {
              id: 'doc-1',
              name: 'Notes',
              parent_id: 'team-root',
              resource_type: 'doc',
              space_type: 'teamspace',
              has_children: false,
              creator: {
                label: 'Lizhi',
                initial: 'L',
                tone: '0',
                interactive: false,
              },
              collaborators: [
                {
                  label: '鲍勃（bob）',
                  initial: '鲍',
                  tone: '2',
                  interactive: true,
                  user_id: 'user-b',
                },
              ],
            } as unknown as Resource
          }
        />
      );
    });

    const creator = container.querySelector('[data-testid="resource-creator"]');
    const collaborators = container.querySelector(
      '[data-testid="resource-collaborators"]'
    );
    expect(creator?.querySelector('[data-type="mention"]')).toBeNull();
    const mention = collaborators?.querySelector('[data-type="mention"]');
    expect(mention?.getAttribute('data-id')).toBe('user-b');
    await act(async () => {
      mention?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    expect(document.body.textContent).toContain('鲍勃');
    expect(document.body.textContent).toContain('b@qq.com');
    expect(collaborators?.textContent).toContain('鲍勃（bob）');
    (
      globalThis as { __mentionMembers?: Record<string, unknown> }
    ).__mentionMembers = undefined;
  });

  it('replaces a stale attribute name when the member list refreshes', async () => {
    (
      globalThis as { __mentionMembers?: Record<string, unknown> }
    ).__mentionMembers = {
      'user-b': {
        id: 'user-b',
        username: 'bob',
        nickname: '新名',
        email: 'b@qq.com',
      },
    };
    await act(async () => {
      root.render(
        <Attributes
          namespaceId="namespace-1"
          resource={
            {
              id: 'doc-1',
              name: 'Notes',
              parent_id: 'team-root',
              resource_type: 'doc',
              space_type: 'teamspace',
              has_children: false,
              creator: {
                label: '旧创建者（hewen）',
                initial: '旧',
                tone: '0',
                interactive: true,
                user_id: 'user-a',
              },
              collaborators: [
                {
                  label: '旧名（bob）',
                  initial: '旧',
                  tone: '2',
                  interactive: true,
                  user_id: 'user-b',
                },
              ],
            } as unknown as Resource
          }
        />
      );
    });

    const collaborators = container.querySelector(
      '[data-testid="resource-collaborators"]'
    );
    const creator = container.querySelector('[data-testid="resource-creator"]');
    expect(collaborators?.textContent).toContain('新名（bob）');
    expect(collaborators?.textContent).not.toContain('旧名（bob）');
    expect(creator?.textContent).toContain('旧创建者（hewen）');
    (
      globalThis as { __mentionMembers?: Record<string, unknown> }
    ).__mentionMembers = undefined;
  });
});
