/** @jest-environment jsdom */

import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { Resource, ResourceCommentThread } from '@/interface';
import { listResourceCommentThreads } from '@/service/resourceComments';

import type { ResourceCommentsController } from './useResourceComments';
import { useResourceComments } from './useResourceComments';

jest.mock('react-router-dom', () => ({ useLocation: () => ({ hash: '' }) }));
jest.mock('@import-ai/omnibox-editor', () => ({}));
jest.mock('./commentAnchors', () => ({}));
jest.mock('./ResourceCommentsContext', () => ({
  useResourceCommentsPanel: () => null,
}));
jest.mock('@/service/resourceComments', () => ({
  listResourceCommentThreads: jest.fn(),
}));
jest.mock('@/page/resource/mentionLabelSync', () => ({
  syncCommentMentionLabels: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => ({ on: () => () => undefined }),
}));
jest.mock('@/hooks/useUser', () => ({
  USER_UPDATED_EVENT: 'user-updated',
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function thread(id: string, resolved = false): ResourceCommentThread {
  return {
    id,
    resolved,
    type: 'inline',
    quoted_text: id,
    anchor: {
      from: 1,
      to: 2,
      prefix: '',
      suffix: '',
      content_hash: 'hash',
      status: 'active',
    },
    creator: { id: 'author', username: 'Author' },
    comments: [],
    created_at: '2026-09-10T00:00:00Z',
    updated_at: '2026-09-10T00:00:00Z',
  } as ResourceCommentThread;
}

function resource(
  id: string,
  commentThreads: ResourceCommentThread[]
): Resource {
  return { id, comment_threads: commentThreads } as Resource;
}

function page(items: ResourceCommentThread[], hasMore = false, offset = 0) {
  return {
    items,
    total: items.length,
    offset,
    limit: 100,
    has_more: hasMore,
  };
}

describe('comment list refresh', () => {
  let root: Root;
  let container: HTMLDivElement;
  const api = { current: null as ResourceCommentsController | null };

  function Harness({ current }: { current: Resource }) {
    const controller = useResourceComments({
      namespaceId: 'namespace',
      resource: current,
      enabled: true,
    });
    const apiRef = useRef(api);
    apiRef.current.current = controller;
    return (
      <output data-loading={controller.loading ? '1' : '0'}>
        {controller.threads.map(item => item.id).join(',')}
      </output>
    );
  }

  const output = () => container.querySelector('output');
  const ids = () => output()?.textContent;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    jest.mocked(listResourceCommentThreads).mockReset();
    jest.mocked(listResourceCommentThreads).mockResolvedValue(page([]));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('loads every filtered thread when the panel opens and ignores a stale page', async () => {
    let finishStale: ((value: ReturnType<typeof page>) => void) | undefined;
    jest
      .mocked(listResourceCommentThreads)
      .mockImplementation(async (_namespace, _resource, options) => {
        if (options?.view !== 'sidebar') return page([]);
        if (options.limit === 100 && options.resolved !== true) {
          return new Promise(resolve => {
            finishStale = resolve;
          });
        }
        if (options.resolved === true) return page([thread('fresh', true)]);
        return page([thread('local')]);
      });

    await act(async () => {
      root.render(
        <Harness current={resource('resource', [thread('local')])} />
      );
    });
    expect(ids()).toBe('local');

    await act(async () => {
      api.current?.setPanelOpen(true);
    });
    expect(output()?.dataset.loading).toBe('1');
    expect(ids()).toBe('local');
    await act(async () => {
      api.current?.setResolved(true);
    });
    await act(async () => {
      finishStale?.(page([thread('stale')]));
      await Promise.resolve();
    });

    expect(ids()).toBe('fresh');
    expect(listResourceCommentThreads).toHaveBeenLastCalledWith(
      'namespace',
      'resource',
      { offset: 0, limit: 100, resolved: true, view: 'sidebar' }
    );
  });

  it('keeps the previous discussions when the refresh fails', async () => {
    jest
      .mocked(listResourceCommentThreads)
      .mockImplementation(async (_namespace, _resource, options) => {
        if (options?.view === 'sidebar' && options.limit === 100) {
          throw new Error('offline');
        }
        return page([thread('local')]);
      });
    await act(async () => {
      root.render(
        <Harness current={resource('resource', [thread('local')])} />
      );
    });
    await act(async () => {
      api.current?.setPanelOpen(true);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(ids()).toBe('local');
    expect(output()?.dataset.loading).toBe('0');
  });

  it('does not list threads again when only the resource changes', async () => {
    await act(async () => {
      root.render(<Harness current={resource('first', [thread('one')])} />);
    });
    await act(async () => {
      api.current?.setPanelOpen(true);
    });
    await act(async () => {
      await Promise.resolve();
    });
    const sidebarCalls = () =>
      jest
        .mocked(listResourceCommentThreads)
        .mock.calls.filter(call => call[2]?.view === 'sidebar').length;
    const calls = sidebarCalls();

    await act(async () => {
      root.render(<Harness current={resource('second', [thread('two')])} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(ids()).toBe('two');
    expect(sidebarCalls()).toBe(calls);
  });

  it('loads again when the panel is reopened', async () => {
    await act(async () => {
      root.render(<Harness current={resource('resource', [thread('one')])} />);
    });
    await act(async () => {
      api.current?.setPanelOpen(true);
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      api.current?.setPanelOpen(false);
    });
    jest.mocked(listResourceCommentThreads).mockClear();

    await act(async () => {
      api.current?.setPanelOpen(true);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      jest
        .mocked(listResourceCommentThreads)
        .mock.calls.filter(call => call[2]?.view === 'sidebar')
    ).toHaveLength(1);
  });
});
