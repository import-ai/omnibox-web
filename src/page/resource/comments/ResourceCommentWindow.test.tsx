/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { TooltipProvider } from '@/components/tooltip';
import type { ResourceCommentThread } from '@/interface';

import { useResourceCommentsPanel } from './ResourceCommentsContext';
import { ResourceCommentThreadList } from './ResourceCommentThreadList';
import type { ResourceCommentsController } from './useResourceComments';

jest.mock('./ResourceCommentsContext', () => ({
  useResourceCommentsPanel: jest.fn(),
}));
jest.mock('./ResourceCommentThreadItem', () => ({
  ResourceCommentThreadItem: ({ thread }: { thread: { id: string } }) => (
    <article data-thread-id={thread.id} />
  ),
}));
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ key: 'window', hash: '' }),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const threadCount = 21;
const threads: ResourceCommentThread[] = Array.from(
  { length: threadCount },
  (_, index) => ({
    id: `thread-${index}`,
    quoted_text: `Quote ${index}`,
    anchor: {
      from: index,
      to: index + 1,
      prefix: '',
      suffix: '',
      content_hash: 'hash',
      status: 'active',
    },
    resolved: false,
    creator: { id: 'author', username: 'Author' },
    comments: [
      {
        id: `comment-${index}`,
        author: { id: 'author', username: 'Author' },
        content: `Comment ${index}`,
        created_at: '2026-09-10T00:00:00Z',
        updated_at: '2026-09-10T00:00:00Z',
      },
    ],
    created_at: '2026-09-10T00:00:00Z',
    updated_at: '2026-09-10T00:00:00Z',
  })
);

function rect(top: number, height: number): DOMRect {
  return {
    x: 0,
    y: top,
    top,
    bottom: top + height,
    left: 0,
    right: 320,
    width: 320,
    height,
    toJSON: () => ({}),
  };
}

describe('comment document window', () => {
  let root: Root;
  let container: HTMLDivElement;

  const cardIds = () =>
    Array.from(container.querySelectorAll<HTMLElement>('[data-thread-id]')).map(
      element => element.dataset.threadId
    );

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement('div');
    const source = document.createElement('div');
    source.setAttribute('data-resource-scroll', '');
    threads.forEach((thread, index) => {
      const marker = document.createElement('span');
      marker.dataset.resourceCommentThread = thread.id;
      marker.dataset.markerTop = String((threadCount - 1 - index) * 100);
      source.append(marker);
    });
    const comments = document.createElement('div');
    comments.setAttribute('data-comments-scroll', '');
    container.append(source, comments);
    document.body.append(container);
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
        if (this.dataset.markerTop) {
          return rect(Number(this.dataset.markerTop), 20);
        }
        if (this.hasAttribute('data-comments-scroll')) {
          return rect(0, 400);
        }
        return rect(0, 80);
      });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('renders the first 20 discussions in document order and reveals the rest locally', async () => {
    root = createRoot(container.querySelector('[data-comments-scroll]')!);
    await act(async () => {
      root.render(
        <TooltipProvider>
          <ResourceCommentThreadList
            controller={
              {
                threads,
                resolved: false,
                activeThreadId: null,
                navigatingThreadId: null,
                editor: null,
                currentUserId: 'author',
                canComment: false,
              } as ResourceCommentsController
            }
          />
        </TooltipProvider>
      );
    });
    await act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(cardIds()).toEqual(
      Array.from(
        { length: 20 },
        (_, index) => `thread-${threadCount - 1 - index}`
      )
    );
    expect(cardIds()).not.toContain('thread-0');

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    await act(async () => button?.click());
    await act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(cardIds()).toContain('thread-0');
    expect(cardIds()).toHaveLength(21);
  });
});
