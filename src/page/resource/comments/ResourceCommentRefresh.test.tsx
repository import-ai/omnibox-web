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
  return { id, resolved } as ResourceCommentThread;
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
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finishStale = resolve;
          })
      )
      .mockResolvedValueOnce(page([thread('fresh', true)]));

    await act(async () => {
      root.render(
        <Harness current={resource('resource', [thread('local')])} />
      );
    });
    expect(listResourceCommentThreads).not.toHaveBeenCalled();

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
      { offset: 0, limit: 100, resolved: true }
    );
  });

  it('keeps the previous discussions when the refresh fails', async () => {
    jest
      .mocked(listResourceCommentThreads)
      .mockRejectedValueOnce(new Error('offline'));
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
    const calls = jest.mocked(listResourceCommentThreads).mock.calls.length;

    await act(async () => {
      root.render(<Harness current={resource('second', [thread('two')])} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(ids()).toBe('two');
    expect(listResourceCommentThreads).toHaveBeenCalledTimes(calls);
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

    expect(listResourceCommentThreads).toHaveBeenCalledTimes(1);
  });
});
