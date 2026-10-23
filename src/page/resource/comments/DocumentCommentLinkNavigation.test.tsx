/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import type { ResourceDocumentCommentThread } from '@/interface';
import * as api from '@/service/resourceComments';

import { useResourceCommentsPanel } from './ResourceCommentsContext';
import { useResourceComments } from './useResourceComments';

jest.mock('@import-ai/omnibox-editor', () => ({}));
jest.mock('@/hooks/useUser', () => ({ USER_UPDATED_EVENT: 'user-updated' }));
jest.mock('react-router-dom', () => ({ useLocation: jest.fn() }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('./ResourceCommentsContext', () => ({
  useResourceCommentsPanel: jest.fn(),
}));
jest.mock('@/service/resourceComments', () => ({
  listResourceCommentThreads: jest.fn(),
  getResourceCommentThread: jest.fn(),
  updateResourceCommentThread: jest.fn(),
  updateResourceComment: jest.fn(),
  deleteResourceComment: jest.fn(),
  deleteResourceCommentThread: jest.fn(),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const documentThread: ResourceDocumentCommentThread = {
  id: 'target',
  type: 'document',
  anchor: null,
  quoted_text: '',
  resolved: false,
  creator: { id: 'author', username: 'Author' },
  comments: [
    {
      id: 'comment',
      author: { id: 'author', username: 'Author' },
      content: 'Original comment',
      created_at: '2026-10-21T00:00:00Z',
      updated_at: '2026-10-21T00:00:00Z',
    },
  ],
  created_at: '2026-10-21T00:00:00Z',
  updated_at: '2026-10-21T00:00:00Z',
};
const resource = { id: 'resource', current_permission: 'can_comment' as const };
let controller: ReturnType<typeof useResourceComments>;
function Fixture({
  namespaceId = 'namespace',
  resourceId = 'resource',
}: {
  namespaceId?: string;
  resourceId?: string;
}) {
  controller = useResourceComments({
    namespaceId,
    resource: { ...resource, id: resourceId },
    enabled: true,
  });
  return (
    <>
      <div data-resource-scroll>
        <span data-resource-comment-thread="target">A stale inline marker</span>
        <span data-resource-body-end />
        {controller.documentThreads.map(thread => (
          <article key={thread.id} data-document-comment-id={thread.id}>
            <textarea />
          </article>
        ))}
        <span data-document-comments-end />
      </div>
      <div data-comments-scroll>
        {controller.threads.map(thread => (
          <article key={thread.id} data-thread-id={thread.id} />
        ))}
      </div>
    </>
  );
}

describe('document comment permalink', () => {
  let root: Root;
  let container: HTMLDivElement;
  const scrollIntoView = jest.fn();
  const panelOpen = jest.fn();
  const shift = jest.fn();
  const render = async (props: Parameters<typeof Fixture>[0] = {}) => {
    await act(async () => root.render(<Fixture {...props} />));
  };
  const advance = async () => {
    await act(async () => jest.advanceTimersByTime(1800));
  };
  beforeEach(() => {
    scrollIntoView.mockReset();
    jest.useFakeTimers();
    localStorage.setItem('uid', 'author');
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    jest.mocked(useLocation).mockReturnValue({
      key: 'link',
      hash: '#comment-target',
      pathname: '/namespace/resource',
      search: '',
      state: null,
    });
    jest.mocked(useResourceCommentsPanel).mockReturnValue({
      rootElement: container,
      panelElement: container,
      panelOpen: true,
      setPanelOpen: panelOpen,
      setPanelElement: jest.fn(),
      namespaceId: 'namespace',
      commentFocusOffset: 0,
      setCommentFocusOffset: shift,
    });
    jest.mocked(api.listResourceCommentThreads).mockResolvedValue({
      items: [],
      total: 41,
      offset: 0,
      limit: 20,
      has_more: true,
    });
    jest.mocked(api.getResourceCommentThread).mockResolvedValue(documentThread);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    jest.clearAllMocks();
    jest.useRealTimers();
    localStorage.clear();
    container.remove();
  });

  it.each(['namespace', 'share:shared'])(
    'loads a page-external bottom target in %s without an editor or composer focus',
    async namespaceId => {
      const focus = jest.spyOn(HTMLElement.prototype, 'focus');
      await render({ namespaceId });
      await advance();
      expect(api.getResourceCommentThread).toHaveBeenCalledWith(
        namespaceId,
        'resource',
        'target'
      );
      expect(controller.documentThreads.map(thread => thread.id)).toEqual([
        'target',
      ]);
      expect(scrollIntoView).toHaveBeenCalled();
      expect(panelOpen).not.toHaveBeenCalled();
      expect(focus).not.toHaveBeenCalled();
      expect(shift).not.toHaveBeenCalled();
      expect(container.querySelector('[data-comment-highlight]')).toBeNull();
      await act(async () => controller.loadMoreDocumentThreads());
      expect(api.listResourceCommentThreads).toHaveBeenLastCalledWith(
        namespaceId,
        'resource',
        { view: 'document', resolved: false, offset: 0, limit: 20 }
      );
      expect(controller.documentTotal).toBe(41);
      focus.mockRestore();
    }
  );

  it('opens resolved documents in the sidebar and reuses the same hash after reopening', async () => {
    jest
      .mocked(api.getResourceCommentThread)
      .mockResolvedValue({ ...documentThread, resolved: true });
    await render();
    await advance();
    expect(controller.resolved).toBe(true);
    expect(controller.activeThreadId).toBe('target');
    expect(panelOpen).toHaveBeenCalledWith(true);
    expect(shift).not.toHaveBeenCalled();
    scrollIntoView.mockClear();
    jest
      .mocked(api.updateResourceCommentThread)
      .mockResolvedValue(documentThread);
    await act(async () => controller.setThreadResolved('target', false));
    await advance();
    expect(controller.documentThreads.map(thread => thread.id)).toEqual([
      'target',
    ]);
    expect(api.getResourceCommentThread).toHaveBeenCalledTimes(1);
    jest.mocked(api.getResourceCommentThread).mockResolvedValue(documentThread);
    jest.mocked(useLocation).mockReturnValue({
      key: 'reopened-link',
      hash: '#comment-target',
      pathname: '/namespace/resource',
      search: '',
      state: null,
    });
    await render();
    await advance();
    expect(scrollIntoView).toHaveBeenCalled();
    expect(api.getResourceCommentThread).toHaveBeenCalledTimes(2);
    expect(shift).not.toHaveBeenCalled();
  });

  it('centers resolved document permalinks in the sidebar without scrolling other ancestors', async () => {
    jest
      .mocked(api.getResourceCommentThread)
      .mockResolvedValue({ ...documentThread, resolved: true });
    await render();

    const commentsScroll = container.querySelector<HTMLElement>(
      '[data-comments-scroll]'
    )!;
    const scrollTo = jest.fn();
    Object.defineProperties(commentsScroll, {
      clientHeight: { configurable: true, value: 400 },
      scrollHeight: { configurable: true, value: 1200 },
      scrollTo: { configurable: true, value: scrollTo },
    });
    const rect = (top: number, bottom: number) => ({
      top,
      bottom,
      left: 0,
      right: 300,
      width: 300,
      height: bottom - top,
      x: 0,
      y: top,
      toJSON: () => ({}),
    });
    const bounds = jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        if (this === commentsScroll) return rect(100, 500);
        if (this.hasAttribute('data-resource-scroll')) return rect(0, 600);
        if (this.hasAttribute('data-resource-body-end')) return rect(250, 250);
        if (this.dataset.threadId === 'target') return rect(530, 590);
        return rect(0, 0);
      });

    await advance();

    expect(scrollTo).toHaveBeenCalledWith({ top: 260, behavior: 'smooth' });
    expect(scrollIntoView).not.toHaveBeenCalled();
    bounds.mockRestore();
  });

  it('does not change the filter when resolving a comment opened through its permalink', async () => {
    await render();
    await advance();
    expect(controller.resolved).toBe(false);
    jest
      .mocked(api.updateResourceCommentThread)
      .mockResolvedValue({ ...documentThread, resolved: true });
    await act(async () => controller.setThreadResolved('target', true));
    await advance();
    expect(controller.resolved).toBe(false);
    expect(controller.documentThreads).toHaveLength(0);
    expect(controller.threads).toHaveLength(0);
    expect(api.getResourceCommentThread).toHaveBeenCalledTimes(1);
  });

  it('brings an offscreen body boundary back into view before locating a resolved document card', async () => {
    jest
      .mocked(api.getResourceCommentThread)
      .mockResolvedValue({ ...documentThread, resolved: true });
    await render();
    const boundary = container.querySelector<HTMLElement>(
      '[data-resource-body-end]'
    )!;
    const source = container.querySelector<HTMLElement>(
      '[data-resource-scroll]'
    )!;
    const commentsScroll = container.querySelector<HTMLElement>(
      '[data-comments-scroll]'
    )!;
    const scrollTo = jest.fn();
    Object.defineProperties(commentsScroll, {
      clientHeight: { configurable: true, value: 400 },
      scrollHeight: { configurable: true, value: 1200 },
      scrollTo: { configurable: true, value: scrollTo },
    });
    let boundaryBottom = -200;
    const rect = (top: number, bottom: number) => ({
      top,
      bottom,
      left: 0,
      right: 300,
      width: 300,
      height: bottom - top,
      x: 0,
      y: top,
      toJSON: () => ({}),
    });
    jest
      .spyOn(source, 'getBoundingClientRect')
      .mockImplementation(() => rect(0, 600));
    jest
      .spyOn(boundary, 'getBoundingClientRect')
      .mockImplementation(() => rect(boundaryBottom, boundaryBottom));
    jest
      .spyOn(commentsScroll, 'getBoundingClientRect')
      .mockImplementation(() => rect(100, 500));
    jest
      .spyOn(
        container.querySelector<HTMLElement>('[data-thread-id="target"]')!,
        'getBoundingClientRect'
      )
      .mockImplementation(() => rect(530, 590));
    scrollIntoView.mockImplementation(function (this: HTMLElement) {
      if (this === boundary) boundaryBottom = 300;
    });
    await advance();
    const calls = scrollIntoView.mock.contexts as HTMLElement[];
    expect(calls[0]).toBe(boundary);
    expect(calls.some(element => element.dataset.threadId === 'target')).toBe(
      false
    );
    expect(scrollTo).toHaveBeenCalledWith({ top: 260, behavior: 'smooth' });
    scrollIntoView.mockReset();
  });

  it('shows one translated unavailable message and does not retry an inaccessible target', async () => {
    jest
      .mocked(api.getResourceCommentThread)
      .mockRejectedValue(new Error('Not found'));
    await render();
    await advance();
    await render();
    await advance();
    expect(toast.error).toHaveBeenCalledWith(
      'resource_comments.comment_unavailable'
    );
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(api.getResourceCommentThread).toHaveBeenCalledTimes(1);
  });

  it('accepts a fresh permalink lookup after a collaborator reopens a locally resolved comment', async () => {
    await render();
    await advance();
    jest
      .mocked(api.updateResourceCommentThread)
      .mockResolvedValue({ ...documentThread, resolved: true });
    await act(async () => controller.setThreadResolved('target', true));
    await advance();
    expect(controller.documentThreads).toHaveLength(0);
    jest.mocked(useLocation).mockReturnValue({
      key: 'new-link',
      hash: '#comment-target',
      pathname: '/namespace/resource',
      search: '',
      state: null,
    });
    jest.mocked(api.getResourceCommentThread).mockResolvedValue(documentThread);
    await render();
    await advance();
    expect(api.getResourceCommentThread).toHaveBeenCalledTimes(2);
    expect(controller.documentThreads.map(thread => thread.id)).toEqual([
      'target',
    ]);
    expect(controller.activeThread?.resolved).toBe(false);
    expect(controller.documentTotal).toBe(41);
  });

  it('keeps authoritative totals when a collection refresh precedes a fresh lookup after a remote reopen', async () => {
    let serverResolved = false;
    const other = {
      ...documentThread,
      id: 'other',
      resolved: true,
      type: 'inline' as const,
      anchor: {
        from: 0,
        to: 1,
        prefix: '',
        suffix: '',
        content_hash: 'hash',
        status: 'active' as const,
      },
    };
    jest
      .mocked(api.listResourceCommentThreads)
      .mockImplementation(async (_namespace, _resource, options) => {
        const items =
          options?.view === 'document'
            ? serverResolved
              ? []
              : [documentThread]
            : [
                other,
                ...(serverResolved
                  ? [{ ...documentThread, resolved: true }]
                  : []),
              ].filter(
                thread =>
                  options?.resolved === undefined ||
                  thread.resolved === options.resolved
              );
        return {
          items,
          total: items.length,
          offset: 0,
          limit: 20,
          has_more: false,
        };
      });
    await render();
    await advance();
    serverResolved = true;
    jest
      .mocked(api.updateResourceCommentThread)
      .mockResolvedValue({ ...documentThread, resolved: true });
    await act(async () => controller.setThreadResolved('target', true));
    serverResolved = false;
    await act(async () => controller.setResolved(true));
    expect(controller.total).toBe(1);
    jest.mocked(useLocation).mockReturnValue({
      key: 'refreshed-link',
      hash: '#comment-target',
      pathname: '/namespace/resource',
      search: '',
      state: null,
    });
    await render();
    await advance();
    expect(controller.total).toBe(1);
    expect(controller.documentTotal).toBe(1);
  });

  it.each(['delete-thread', 'delete-comment', 'resolve', 'edit'])(
    'preserves a successful %s when an older permalink response arrives later',
    async action => {
      let finish!: (value: ResourceDocumentCommentThread) => void;
      jest.mocked(api.getResourceCommentThread).mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finish = resolve;
          })
      );
      jest
        .mocked(api.listResourceCommentThreads)
        .mockImplementation(async (_namespace, _resource, options) => ({
          items: options?.view === 'document' ? [documentThread] : [],
          total: options?.view === 'document' ? 1 : 0,
          offset: 0,
          limit: 20,
          has_more: false,
        }));
      await render();
      expect(controller.documentThreads).toHaveLength(1);

      if (action === 'delete-thread') {
        jest.mocked(api.deleteResourceCommentThread).mockResolvedValue();
        await act(async () => controller.removeThread('target'));
      } else if (action === 'delete-comment') {
        jest.mocked(api.deleteResourceComment).mockResolvedValue(null);
        await act(async () => controller.removeComment('target', 'comment'));
      } else if (action === 'resolve') {
        jest
          .mocked(api.updateResourceCommentThread)
          .mockResolvedValue({ ...documentThread, resolved: true });
        await act(async () => controller.setThreadResolved('target', true));
      } else {
        jest.mocked(api.updateResourceComment).mockResolvedValue({
          ...documentThread,
          comments: [
            { ...documentThread.comments[0], content: 'Edited comment' },
          ],
        });
        await act(async () =>
          controller.editComment('target', 'comment', 'Edited comment')
        );
      }

      await act(async () => finish(documentThread));
      await advance();
      if (action === 'edit') {
        expect(controller.documentThreads[0].comments[0].content).toBe(
          'Edited comment'
        );
      } else {
        expect(controller.documentThreads).toHaveLength(0);
        if (action === 'resolve') {
          expect(controller.resolved).toBe(false);
          expect(controller.activeThreadId).toBeNull();
        } else {
          expect(controller.activeThread).toBeNull();
          expect(controller.activeThreadId).toBeNull();
          expect(scrollIntoView).not.toHaveBeenCalled();
        }
      }
    }
  );

  it('does not refocus a deleted target while its initial navigation is pending', async () => {
    await render();
    jest.mocked(api.deleteResourceCommentThread).mockResolvedValue();
    await act(async () => controller.removeThread('target'));
    await advance();
    expect(controller.activeThreadId).toBeNull();
    expect(controller.documentThreads).toHaveLength(0);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('discards a target lookup when navigating to a different resource', async () => {
    let finish!: (value: ResourceDocumentCommentThread) => void;
    jest.mocked(api.getResourceCommentThread).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    await render();
    jest
      .mocked(api.getResourceCommentThread)
      .mockRejectedValueOnce(new Error('Missing'));
    await render({ resourceId: 'other' });
    await act(async () => finish(documentThread));
    await advance();
    expect(controller.documentThreads).toHaveLength(0);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
