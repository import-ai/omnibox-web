/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { TooltipProvider } from '@/components/tooltip';
import type { ResourceCommentThread } from '@/interface';

import { useResourceCommentsPanel } from './ResourceCommentsContext';
import { ResourceCommentThreadList } from './ResourceCommentThreadList';
import { useResourceComments } from './useResourceComments';

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});

jest.mock('@/components/button', () =>
  jest.requireActual('@/components/ui/Button')
);
jest.mock('@import-ai/omnibox-editor', () => ({
  findResourceCommentRange: jest.fn(),
}));
jest.mock('@/service/resourceComments', () => ({}));
jest.mock('./commentAnchors', () => ({}));
jest.mock('./ResourceCommentsContext', () => ({
  useResourceCommentsPanel: jest.fn(),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: jest.fn(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
    unobserve: jest.fn(),
  })),
});

const threads: ResourceCommentThread[] = ['a', 'b', 'c'].map(id => ({
  id,
  quoted_text: `Quote ${id}`,
  anchor: {
    from: 1,
    to: 4,
    prefix: '',
    suffix: '',
    content_hash: 'hash',
    status: 'active',
  },
  resolved: false,
  creator: { id: 'author', username: 'Author' },
  comments: [
    {
      id: `comment-${id}`,
      author: { id: 'author', username: 'Author' },
      content: `Comment ${id}`,
      created_at: '2026-09-10T00:00:00Z',
      updated_at: '2026-09-10T00:00:00Z',
    },
  ],
  created_at: '2026-09-10T00:00:00Z',
  updated_at: '2026-09-10T00:00:00Z',
}));
const resource = { id: 'resource', comment_threads: threads };
const resolvedThreads = threads.map(thread => ({ ...thread, resolved: true }));
const resolvedResource = { id: 'resource', comment_threads: resolvedThreads };
const loadMore = jest.fn();
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ key: 'default', hash: '' }),
}));

function Fixture({ resolved = false }: { resolved?: boolean }) {
  const controller = useResourceComments({
    namespaceId: 'namespace',
    resource: resolved ? resolvedResource : resource,
    enabled: false,
  });
  return (
    <TooltipProvider>
      <ResourceCommentThreadList
        controller={{
          ...controller,
          threads: resolved ? resolvedThreads : threads,
          canComment: true,
          canEditComment: () => true,
        }}
        loadMore={loadMore}
      />
    </TooltipProvider>
  );
}

describe('comment selection', () => {
  let root: Root;
  let container: HTMLDivElement;
  let source: HTMLDivElement;
  let comments: HTMLDivElement;
  let commentShift: number;
  let markerSpacing: number;
  const setPanelOpen = jest.fn();

  const card = (id: string) => {
    const element = comments.querySelector<HTMLElement>(
      `[data-thread-id="${id}"]`
    );
    if (!element) {
      throw new Error(`Missing comment ${id}`);
    }
    return element;
  };
  const position = (id: string) => card(id).parentElement?.style.top;
  const settle = async () => {
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
  };
  const click = async (id: string) => {
    await act(async () => {
      card(id).dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    });
    await act(async () => card(id).click());
    await settle();
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    commentShift = 0;
    markerSpacing = 20;
    container = document.createElement('div');
    source = document.createElement('div');
    source.setAttribute('data-resource-scroll', '');
    threads.forEach(thread => {
      const marker = document.createElement('span');
      marker.dataset.resourceCommentThread = thread.id;
      source.append(marker);
    });
    comments = document.createElement('div');
    comments.setAttribute('data-comments-scroll', '');
    container.append(source, comments);
    document.body.append(container);
    jest.mocked(useResourceCommentsPanel).mockReturnValue({
      rootElement: container,
      panelElement: container,
      panelOpen: true,
      setPanelOpen,
      setPanelElement: jest.fn(),
      namespaceId: 'namespace',
      get commentFocusOffset() {
        return commentShift;
      },
      setCommentFocusOffset: value => {
        commentShift = value;
      },
    });
    let sourceScrollTop = 0;
    Object.defineProperties(source, {
      clientHeight: { value: 600 },
      scrollHeight: { value: 2400 },
      scrollTop: {
        get: () => sourceScrollTop,
        set: (value: number) => {
          if (sourceScrollTop !== value) {
            sourceScrollTop = value;
            source.dispatchEvent(new Event('scroll'));
          }
        },
      },
    });
    Object.defineProperties(comments, {
      clientHeight: { value: 600 },
      scrollHeight: {
        get: () =>
          Math.max(
            600,
            parseFloat(
              comments.querySelector<HTMLElement>(
                '.resource-comments-anchored-list'
              )?.style.minHeight ?? '0'
            ) + Math.max(0, commentShift)
          ),
      },
    });
    jest
      .spyOn(HTMLElement.prototype, 'offsetTop', 'get')
      .mockImplementation(function (this: HTMLElement) {
        return parseFloat(this.style.top) || 0;
      });
    jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const index = threads.findIndex(
          thread => thread.id === this.dataset.resourceCommentThread
        );
        const top =
          index >= 0
            ? 100 + index * markerSpacing - source.scrollTop
            : this.hasAttribute('data-thread-id')
              ? (this.parentElement?.offsetTop ?? 0) -
                comments.scrollTop +
                commentShift
              : 0;
        const height =
          index >= 0
            ? 20
            : this.hasAttribute('data-thread-id')
              ? 120 + (this.querySelector('textarea') ? 50 : 0)
              : 600;
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
    root = createRoot(comments);
    await act(async () => root.render(<Fixture />));
    await settle();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('selects without scrolling even when the quote is outside the viewport', async () => {
    source.scrollTop = 700;
    await act(async () => source.dispatchEvent(new Event('scroll')));
    await settle();
    comments.scrollTop = 180;
    const before = position('b');
    const focus = jest.spyOn(HTMLElement.prototype, 'focus');
    await click('b');
    expect(card('b').hasAttribute('data-selected')).toBe(true);
    expect(position('b')).toBe(before);
    expect(source.scrollTop).toBe(700);
    expect(comments.scrollTop).toBe(180);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(card('b').querySelector('textarea'));
    expect(setPanelOpen).not.toHaveBeenCalled();
    expect(
      source
        .querySelector('[data-resource-comment-thread="b"]')
        ?.getAttribute('data-comment-highlight')
    ).toBe('open');
    expect(
      source
        .querySelector('[data-resource-comment-thread="a"]')
        ?.hasAttribute('data-comment-highlight')
    ).toBe(false);
  });

  it('keeps the next card in place while the previous reply collapses', async () => {
    await click('a');
    const before = position('b');
    await click('b');
    expect(position('b')).toBe(before);
    expect(card('a').hasAttribute('data-selected')).toBe(false);
    expect(card('a').querySelector('textarea')).toBeNull();
    expect(card('b').hasAttribute('data-selected')).toBe(true);
    expect(
      card('b').getBoundingClientRect().top -
        card('a').getBoundingClientRect().bottom
    ).toBe(8);
    expect(parseFloat(position('c') ?? '0')).toBeGreaterThanOrEqual(
      parseFloat(position('b') ?? '0') + 170 + 8
    );
  });

  it('opens the comment editor without scrolling or replacing the selected card', async () => {
    await click('b');
    comments.scrollTop = 180;
    const selectedCard = card('b');
    const before = position('b');
    const originalFocus = HTMLElement.prototype.focus;
    jest.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (
      this: HTMLElement,
      options?: FocusOptions
    ) {
      originalFocus.call(this, options);
      // Model the browser scrolling a newly focused textarea into view.
      if (!options?.preventScroll) {
        comments.scrollTop = 320;
      }
    });
    const editButton = selectedCard.querySelector<HTMLButtonElement>(
      '[aria-label="resource_comments.edit"]'
    );
    if (!editButton) {
      throw new Error('Missing edit comment button');
    }

    await act(async () => editButton.click());
    await settle();

    expect(card('b')).toBe(selectedCard);
    expect(card('b').hasAttribute('data-selected')).toBe(true);
    expect(position('b')).toBe(before);
    expect(comments.scrollTop).toBe(180);
    expect(source.scrollTop).toBe(0);
    expect(document.activeElement).toBe(
      selectedCard.querySelector('.omnibox-comment-composer--edit textarea')
    );
  });

  it('preserves natural spacing for quotes in distant paragraphs', async () => {
    markerSpacing = 400;
    await act(async () => source.dispatchEvent(new Event('scroll')));
    await settle();
    await click('a');
    const before = position('b');
    await click('b');
    expect(position('b')).toBe(before);
    expect(
      card('b').getBoundingClientRect().top -
        card('a').getBoundingClientRect().bottom
    ).toBe(280);
  });

  it.each(['navigation', 'quote'])(
    'automatically opens replies after %s and keeps them open on another click',
    async selection => {
      const trigger =
        selection === 'navigation'
          ? card('a').querySelector<HTMLButtonElement>(
              '[aria-label="resource_comments.next_thread"]'
            )
          : card('b').querySelector<HTMLButtonElement>(
              '.omnibox-comment-thread__quote'
            );
      if (!trigger) {
        throw new Error('Missing selection control');
      }
      await act(async () => trigger.click());
      for (let frame = 0; frame < 50; frame += 1) {
        await act(async () => jest.advanceTimersByTime(16));
      }
      expect(card('b').hasAttribute('data-selected')).toBe(true);
      expect(card('b').querySelector('textarea')).not.toBeNull();
      const before = position('b');
      const scrollTop = comments.scrollTop;

      await click('b');

      const input = card('b').querySelector('textarea');
      expect(input).not.toBeNull();
      expect(document.activeElement).toBe(input);
      expect(position('b')).toBe(before);
      expect(comments.scrollTop).toBe(scrollTop);
    }
  );

  it('removes collapsed reply space when navigating to the next comment', async () => {
    await click('a');
    const nextButton = card('a').querySelector<HTMLButtonElement>(
      '[aria-label="resource_comments.next_thread"]'
    );
    if (!nextButton) {
      throw new Error('Missing next comment button');
    }
    await act(async () => nextButton.click());
    for (let frame = 0; frame < 50; frame += 1) {
      await act(async () => jest.advanceTimersByTime(16));
    }
    expect(card('a').querySelector('textarea')).toBeNull();
    expect(card('b').hasAttribute('data-selected')).toBe(true);
    expect(
      card('b').getBoundingClientRect().top -
        card('a').getBoundingClientRect().bottom
    ).toBeCloseTo(8);
    expect(card('b').getBoundingClientRect().top).toBeCloseTo(24);
    expect(source.scrollTop).toBeCloseTo(96);
    expect(card('b').querySelector('textarea')).not.toBeNull();

    const previousButton = card('b').querySelector<HTMLButtonElement>(
      '[aria-label="resource_comments.previous_thread"]'
    );
    if (!previousButton) {
      throw new Error('Missing previous comment button');
    }
    await act(async () => previousButton.click());
    for (let frame = 0; frame < 50; frame += 1) {
      await act(async () => jest.advanceTimersByTime(16));
    }
    expect(card('a').getBoundingClientRect().top).toBeCloseTo(24);
    expect(source.scrollTop).toBeCloseTo(76);
    expect(card('a').querySelector('textarea')).not.toBeNull();
    expect(card('b').querySelector('textarea')).toBeNull();
  });

  it('still follows intentional document scrolling with a selected card', async () => {
    await click('b');
    const before = parseFloat(position('b') ?? '0');
    source.scrollTop = 40;
    await act(async () => source.dispatchEvent(new Event('scroll')));
    await settle();
    expect(parseFloat(position('b') ?? '0')).toBe(before - 40);
  });

  it('keeps card positions while the resource editor replaces its quote markers', async () => {
    const before = threads.map(thread => position(thread.id));
    const markers = Array.from(source.children);
    await act(async () => source.replaceChildren());
    await settle();
    expect(threads.map(thread => position(thread.id))).toEqual(before);

    await act(async () => source.append(...markers));
    await settle();
    expect(threads.map(thread => position(thread.id))).toEqual(before);
  });

  it('cancels pending navigation alignment when a card is selected', async () => {
    comments.scrollTop = 180;
    const nextButton = card('a').querySelector<HTMLButtonElement>(
      '[aria-label="resource_comments.next_thread"]'
    );
    if (!nextButton) {
      throw new Error('Missing next comment button');
    }
    await act(async () => nextButton.click());
    expect(setPanelOpen).toHaveBeenCalledWith(true);
    expect(card('b').hasAttribute('data-selected')).toBe(true);

    await click('c');
    expect(card('c').hasAttribute('data-selected')).toBe(true);
    expect(comments.scrollTop).toBe(180);
    expect(source.scrollTop).toBe(0);
  });

  it('keeps the card aligned after document scrolling updates the anchored list', async () => {
    source.scrollTop = 700;
    await settle();
    const nextButton = card('a').querySelector<HTMLButtonElement>(
      '[aria-label="resource_comments.next_thread"]'
    );
    if (!nextButton) {
      throw new Error('Missing next comment button');
    }
    await act(async () => nextButton.click());
    for (let frame = 0; frame < 50; frame += 1) {
      await act(async () => jest.advanceTimersByTime(16));
    }
    const quote = source.querySelector<HTMLElement>(
      '[data-resource-comment-thread="b"]'
    );
    expect(card('b').getBoundingClientRect().top).toBeCloseTo(
      quote?.getBoundingClientRect().top ?? Number.NaN,
      0
    );
    expect(card('b').hasAttribute('data-selected')).toBe(true);
    await settle();
    expect(card('b').getBoundingClientRect().top).toBeCloseTo(
      quote?.getBoundingClientRect().top ?? Number.NaN,
      0
    );
  });

  it('jumps to a resolved quote and highlights only its four referenced characters', async () => {
    await act(async () => root.render(<Fixture resolved />));
    const quote = source.querySelector<HTMLElement>(
      '[data-resource-comment-thread="b"]'
    );
    if (!quote) {
      throw new Error('Missing quote');
    }
    quote.textContent = '四个文字';
    const paragraph = document.createElement('p');
    paragraph.append('引用前文', quote, '引用后文');
    source.append(paragraph);
    const manualHighlight = document.createElement('mark');
    manualHighlight.textContent = '手动高亮';
    paragraph.append(manualHighlight);
    source.scrollTop = 700;
    await click('b');
    await act(async () => jest.advanceTimersByTime(1200));
    expect(setPanelOpen).toHaveBeenCalledWith(true);
    expect(source.scrollTop).toBeLessThan(700);
    expect(quote.dataset.commentHighlight).toBe('resolved');
    expect(source.querySelectorAll('[data-comment-highlight]')).toHaveLength(1);
    expect(quote.textContent).toBe('四个文字');
    expect(paragraph.hasAttribute('data-comment-highlight')).toBe(false);
    expect(manualHighlight.hasAttribute('data-comment-highlight')).toBe(false);
    expect(window.getSelection()?.toString()).toBe('');
  });

  it('restores the selected quote highlight after editor DOM updates', async () => {
    await click('b');
    const quote = source.querySelector('[data-resource-comment-thread="b"]');
    const replacement = document.createElement('span');
    replacement.dataset.resourceCommentThread = 'b';
    await act(async () => quote?.replaceWith(replacement));
    expect(replacement.dataset.commentHighlight).toBe('open');
    await click('a');
    expect(replacement.hasAttribute('data-comment-highlight')).toBe(false);
    expect(
      source
        .querySelector('[data-resource-comment-thread="a"]')
        ?.getAttribute('data-comment-highlight')
    ).toBe('open');
  });
});
