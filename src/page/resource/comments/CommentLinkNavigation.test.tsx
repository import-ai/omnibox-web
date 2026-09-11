/** @jest-environment jsdom */

import { act, useCallback, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useLocation } from 'react-router-dom';

import type { ResourceCommentThread } from '@/interface';
import { listResourceCommentThreads } from '@/service/resourceComments';

import { useResourceCommentsPanel } from './ResourceCommentsContext';
import { useCommentHighlight } from './useCommentHighlight';
import {
  type CommentFocusOptions,
  useCommentLinkNavigation,
} from './useCommentLinkNavigation';
import { useResourceComments } from './useResourceComments';

jest.mock('react-router-dom', () => ({ useLocation: jest.fn() }));
jest.mock('./ResourceCommentsContext', () => ({
  useResourceCommentsPanel: jest.fn(),
}));
jest.mock('@import-ai/omnibox-editor', () => ({}));
jest.mock('./commentAnchors', () => ({}));
jest.mock('@/service/resourceComments', () => ({
  listResourceCommentThreads: jest.fn(),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const threads: ResourceCommentThread[] = ['first', 'target'].map(id => ({
  id,
  quoted_text: id,
  creator: { id: 'author', username: 'Author' },
  resolved: false,
  comments: [],
  anchor: {
    from: 1,
    to: 5,
    prefix: '',
    suffix: '',
    content_hash: 'hash',
    status: 'active',
  },
  created_at: '2026-09-10T00:00:00Z',
  updated_at: '2026-09-10T00:00:00Z',
}));
const focusThread = jest.fn(
  (_threadId: string, options?: CommentFocusOptions) => {
    options?.onLocated?.();
  }
);
const opened = jest.fn();

function Fixture({
  ready = true,
  available = threads,
  showMarkers = true,
}: {
  ready?: boolean;
  available?: ResourceCommentThread[];
  showMarkers?: boolean;
}) {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const openThread = useCallback((id: string) => {
    opened(id);
    setActiveThreadId(id);
  }, []);
  useCommentLinkNavigation({
    enabled: true,
    loading: false,
    resourceId: 'resource',
    editorReady: ready,
    activeThreadId,
    threads: available,
    openThread,
    focusThread,
  });
  const panel = useResourceCommentsPanel();
  useCommentHighlight({
    root: panel?.rootElement,
    activeThreadId,
    resolved:
      available.find(thread => thread.id === activeThreadId)?.resolved ?? false,
  });
  return (
    <>
      <div data-resource-scroll className="tiptap ProseMirror">
        {showMarkers &&
          available.map(thread => (
            <p key={thread.id}>
              <span data-resource-comment-thread={thread.id}>Quoted text</span>
              <span data-resource-comment-thread={thread.id}>
                <strong>More quoted text</strong>
              </span>
            </p>
          ))}
      </div>
      <div data-comments-scroll>
        {available.map(thread => (
          <div key={thread.id}>
            <article
              data-thread-id={thread.id}
              data-selected={activeThreadId === thread.id || undefined}
            />
          </div>
        ))}
      </div>
    </>
  );
}

const resource = { id: 'resource', comment_threads: threads };
function PaginatedFixture() {
  const controller = useResourceComments({
    namespaceId: 'namespace',
    resource,
    enabled: true,
  });
  return (
    <>
      <output>{controller.threads.map(thread => thread.id).join(',')}</output>
      <button onClick={controller.loadMore}>More</button>
      <button onClick={() => controller.setResolved(false)}>Open</button>
    </>
  );
}

describe('comment link navigation', () => {
  let root: Root;
  let container: HTMLDivElement;
  const navigate = (hash: string, key = hash) => {
    jest.mocked(useLocation).mockReturnValue({
      pathname: '/namespace/resource',
      search: '',
      state: null,
      hash,
      key,
    });
  };
  const render = async (
    ready = true,
    available = threads,
    showMarkers = true
  ) => {
    await act(async () =>
      root.render(
        <Fixture
          ready={ready}
          available={available}
          showMarkers={showMarkers}
        />
      )
    );
  };
  const advance = async (time = 600) => {
    await act(async () => jest.advanceTimersByTime(time));
  };
  const card = (id = 'target') =>
    container.querySelector<HTMLElement>(`[data-thread-id="${id}"]`);
  const highlightedQuotes = (id = 'target') =>
    container.querySelectorAll(
      `[data-resource-comment-thread="${id}"][data-comment-highlight]`
    );

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    navigate('#comment-target');
    jest.mocked(useResourceCommentsPanel).mockReturnValue({
      rootElement: container,
      panelElement: container,
      panelOpen: true,
      setPanelOpen: jest.fn(),
      setPanelElement: jest.fn(),
      namespaceId: 'namespace',
      commentFocusOffset: 0,
      setCommentFocusOffset: jest.fn(),
    });
    jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const top = this.dataset.threadId === 'target' ? 800 : 0;
        const height = this.hasAttribute('data-comments-scroll') ? 400 : 120;
        return {
          x: 0,
          y: top,
          top,
          bottom: top + height,
          left: 0,
          right: 300,
          width: 300,
          height,
          toJSON: () => ({}),
        };
      });
    jest.mocked(listResourceCommentThreads).mockResolvedValue({
      items: [threads[0]],
      total: 2,
      has_more: true,
      offlet: 0,
      limits: 20,
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('waits for a late editor and keeps every fragment of the quoted body text highlighted', async () => {
    await render(false);
    await advance(2000);
    expect(opened).toHaveBeenCalledWith('target');
    expect(card()?.hasAttribute('data-selected')).toBe(true);
    expect(focusThread).not.toHaveBeenCalled();
    await render();
    await advance(1600);
    expect(focusThread).toHaveBeenCalledWith('target', {
      onLocated: expect.any(Function),
    });
    expect(
      container.querySelector('[data-comments-scroll]')?.scrollTop
    ).toBeGreaterThan(0);
    expect(highlightedQuotes()).toHaveLength(2);
    expect(highlightedQuotes('first')).toHaveLength(0);
    expect(card()?.hasAttribute('data-link-highlight')).toBe(false);
    expect(card()?.hasAttribute('data-comment-highlight')).toBe(false);
    await advance(60000);
    expect(highlightedQuotes()).toHaveLength(2);
    await render();
    await advance(2000);
    expect(focusThread).toHaveBeenCalledTimes(1);
    expect(highlightedQuotes()).toHaveLength(2);
  });

  it('handles another link and a repeated navigation within the same resource', async () => {
    await render();
    await advance(1600);
    navigate('#comment-first');
    await render();
    await advance(1600);
    expect(focusThread).toHaveBeenLastCalledWith('first', {
      onLocated: expect.any(Function),
    });
    expect(highlightedQuotes('first')).toHaveLength(2);
    expect(highlightedQuotes()).toHaveLength(0);
    navigate('#comment-first', 'repeat');
    await render();
    await advance(1600);
    expect(focusThread).toHaveBeenCalledTimes(3);
    navigate('');
    await render();
    navigate('#comment-first', 'repeat');
    await render();
    await advance(1600);
    expect(focusThread).toHaveBeenCalledTimes(4);
  });

  it('waits for comment data and ignores an unknown target', async () => {
    await render(true, []);
    await advance(1600);
    expect(opened).not.toHaveBeenCalled();
    await render();
    await advance(1600);
    expect(focusThread).toHaveBeenCalledWith('target', {
      onLocated: expect.any(Function),
    });
    navigate('#comment-missing');
    await render();
    await advance(1600);
    expect(focusThread).toHaveBeenCalledTimes(1);
  });

  it.each(['resolved', 'orphaned'])(
    'locates a %s comment without a document marker',
    async status => {
      const available = threads.map(thread => ({
        ...thread,
        resolved: status === 'resolved',
        anchor: {
          ...thread.anchor,
          status:
            status === 'orphaned' ? ('orphaned' as const) : ('active' as const),
        },
      }));
      await render(true, available, false);
      await advance();
      expect(focusThread).toHaveBeenCalledWith('target', {
        onLocated: expect.any(Function),
      });
      expect(card()?.hasAttribute('data-selected')).toBe(true);
      expect(container.querySelector('[data-comment-highlight]')).toBeNull();
      expect(card()?.hasAttribute('data-link-highlight')).toBe(false);
    }
  );

  it('cancels pending navigation when the URL changes away', async () => {
    await render();
    navigate('');
    await render();
    await advance(2000);
    expect(focusThread).not.toHaveBeenCalled();
    expect(highlightedQuotes()).toHaveLength(2);
  });

  it('opens a resolved comment link with the resolved highlight on its exact quote fragments', async () => {
    const available = threads.map(thread => ({ ...thread, resolved: true }));
    await render(true, available);
    await advance();
    expect(focusThread).toHaveBeenCalledWith('target', {
      onLocated: expect.any(Function),
    });
    expect(highlightedQuotes()).toHaveLength(2);
    highlightedQuotes().forEach(quote => {
      expect(quote.getAttribute('data-comment-highlight')).toBe('resolved');
      expect(quote.parentElement?.hasAttribute('data-comment-highlight')).toBe(
        false
      );
    });
    expect(highlightedQuotes('first')).toHaveLength(0);
  });

  it('highlights a late anchor and waits for navigation to finish', async () => {
    let finishNavigation: (() => void) | undefined;
    focusThread.mockImplementationOnce((_id, options) => {
      finishNavigation = options?.onLocated;
    });
    await render(true, threads, false);
    await advance(300);
    expect(focusThread).not.toHaveBeenCalled();
    const marker = document.createElement('span');
    marker.dataset.resourceCommentThread = 'target';
    container.append(marker);
    await advance(300);
    expect(focusThread).toHaveBeenCalledTimes(1);
    expect(highlightedQuotes()).toHaveLength(1);
    finishNavigation?.();
    await advance(100);
    expect(highlightedQuotes()).toHaveLength(1);
  });

  it('keeps a target outside the first page visible without skipping pagination items', async () => {
    await act(async () => root.render(<PaginatedFixture />));
    expect(container.querySelector('output')?.textContent).toContain('target');
    await act(async () => container.querySelector('button')?.click());
    expect(listResourceCommentThreads).toHaveBeenLastCalledWith(
      'namespace',
      'resource',
      { offlet: 1, limits: 20, resolved: undefined }
    );
    await act(async () => container.querySelectorAll('button')[1].click());
    expect(container.querySelector('output')?.textContent).toContain('target');
  });
});
