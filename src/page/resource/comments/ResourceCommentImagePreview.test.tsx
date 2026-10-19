/** @jest-environment jsdom */

import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { TooltipProvider } from '@/components/tooltip';
import type {
  ResourceCommentAttachment,
  ResourceCommentThread,
} from '@/interface';

import { ResourceCommentBody } from './ResourceCommentBody';
import { ResourceCommentThreadItem } from './ResourceCommentThreadItem';
import type { ResourceCommentsController } from './useResourceComments';

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
jest.mock('@/lib/captcha', () => ({ isInsideAliyunCaptcha: () => false }));

Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: jest.fn(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
  })),
});

const image: ResourceCommentAttachment = {
  id: 'image',
  name: 'Diagram',
  mimetype: 'image/png',
  size: 10,
  url: '/diagram.png',
};
const thread: ResourceCommentThread = {
  id: 'thread',
  quoted_text: 'Quoted text',
  resolved: false,
  anchor: {
    from: 1,
    to: 5,
    prefix: '',
    suffix: '',
    content_hash: 'hash',
    status: 'active',
  },
  creator: { id: 'author', username: 'Author' },
  comments: [
    {
      id: 'comment',
      content: 'Original comment',
      author: { id: 'author', username: 'Author' },
      created_at: '2026-10-13T00:00:00Z',
      updated_at: '2026-10-13T00:00:00Z',
    },
    {
      id: 'reply',
      content: 'Image reply',
      attachments: [image],
      author: { id: 'other', username: 'Other' },
      created_at: '2026-10-13T00:00:00Z',
      updated_at: '2026-10-13T00:00:00Z',
    },
  ],
  created_at: '2026-10-13T00:00:00Z',
  updated_at: '2026-10-13T00:00:00Z',
};

function ThreadFixture() {
  const [activeThreadId, setActiveThreadId] = useState<string | null>('thread');
  const controller = {
    activeThreadId,
    setActiveThreadId,
    selectThread: setActiveThreadId,
    currentUserId: 'author',
    canComment: true,
    canEditComment: () => true,
    canDeleteComment: () => false,
    canModerateThread: () => false,
    submitting: false,
    threads: [thread],
  } as unknown as ResourceCommentsController;
  return (
    <TooltipProvider>
      <ResourceCommentThreadItem
        controller={controller}
        mode="all"
        thread={thread}
      />
      <button type="button" data-outside="">
        Outside
      </button>
    </TooltipProvider>
  );
}

describe('resource comment image preview', () => {
  let container: HTMLDivElement;
  let root: Root;
  const query = <T extends Element>(selector: string) => {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Missing ${selector}`);
    return element;
  };
  const settle = async () => {
    await act(async () => jest.runOnlyPendingTimers());
  };
  const open = async () => {
    const trigger = query<HTMLButtonElement>(
      '.omnibox-comment-message__image-button'
    );
    expect(trigger.getAttribute('aria-label')).toBe('chat.image.preview');
    await act(async () => trigger.click());
    await settle();
    return trigger;
  };
  const pointerDown = async (element: Element) => {
    await act(async () =>
      element.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, cancelable: true })
      )
    );
  };
  const enterText = async (input: HTMLTextAreaElement, value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )!.set!.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    await settle();
    container.remove();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('focuses a localized close control in the real body Portal', async () => {
    await act(async () =>
      root.render(
        <ResourceCommentBody content="Comment" attachments={[image]} />
      )
    );
    await open();
    const close = document.querySelector(
      '[role="dialog"] button[aria-label="close"]'
    );
    expect(close).not.toBeNull();
    expect(document.activeElement).toBe(close);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('highlights all image-related cards while only one thread is active', async () => {
    function GroupFixture() {
      const [activeThreadId, setActiveThreadId] = useState('first');
      const controller = {
        activeThreadId,
        setActiveThreadId,
        selectThread: setActiveThreadId,
        currentUserId: 'author',
        canComment: true,
        canEditComment: () => true,
        canDeleteComment: () => false,
        canModerateThread: () => false,
        submitting: false,
        threads: [],
      } as unknown as ResourceCommentsController;
      return (
        <TooltipProvider>
          {['first', 'second', 'unrelated'].map(id => (
            <ResourceCommentThreadItem
              key={id}
              controller={controller}
              mode="all"
              thread={{ ...thread, id }}
              imageHighlighted={id !== 'unrelated'}
            />
          ))}
        </TooltipProvider>
      );
    }
    await act(async () => root.render(<GroupFixture />));
    expect(
      [...container.querySelectorAll('[data-image-highlighted]')].map(element =>
        element.getAttribute('data-thread-id')
      )
    ).toEqual(['first', 'second']);
    expect(container.querySelectorAll('[data-selected]')).toHaveLength(1);
    await act(async () =>
      query<HTMLElement>('[data-thread-id="second"]').click()
    );
    expect(container.querySelectorAll('[data-image-highlighted]')).toHaveLength(
      2
    );
    expect(container.querySelectorAll('[data-selected]')).toHaveLength(1);
    expect(query('[data-selected]').getAttribute('data-thread-id')).toBe(
      'second'
    );
    expect(container.querySelectorAll('.omnibox-comment-reply')).toHaveLength(
      1
    );
  });

  it('owns Escape and restores the clicked thumbnail even when it was not focused', async () => {
    await act(async () =>
      root.render(
        <ResourceCommentBody content="Comment" attachments={[image]} />
      )
    );
    const trigger = await open();
    const outerEscape = jest.fn();
    document.addEventListener('keydown', outerEscape);
    try {
      await act(async () =>
        query<HTMLButtonElement>('[role="dialog"] button').dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
            cancelable: true,
          })
        )
      );
      await settle();
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(outerEscape).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(trigger);
      await act(async () =>
        trigger.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
            cancelable: true,
          })
        )
      );
      expect(outerEscape).toHaveBeenCalledTimes(1);
    } finally {
      document.removeEventListener('keydown', outerEscape);
    }
  });

  it.each(['image', 'blank', 'close'] as const)(
    'preserves the real reply draft after preview %s interactions',
    async target => {
      await act(async () => root.render(<ThreadFixture />));
      const article = query<HTMLElement>('article');
      await act(async () => article.click());
      const input = query<HTMLTextAreaElement>(
        '.omnibox-comment-reply textarea'
      );
      await enterText(input, 'Keep this reply');
      expect(input.value).toBe('Keep this reply');
      const trigger = await open();
      const dialog = query<HTMLElement>('[role="dialog"]');
      const surface =
        target === 'image'
          ? query<HTMLElement>('[role="dialog"] img')
          : target === 'close'
            ? query<HTMLElement>('[role="dialog"] button')
            : dialog;
      const nativePointer = jest.fn();
      document.addEventListener('pointerdown', nativePointer);
      try {
        await pointerDown(surface);
        expect(nativePointer).toHaveBeenCalledTimes(1);
        expect(article.hasAttribute('data-selected')).toBe(true);
        expect(
          query<HTMLTextAreaElement>('.omnibox-comment-reply textarea')
        ).toBe(input);
        expect(input.value).toBe('Keep this reply');
        await act(async () => surface.click());
        await settle();
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        expect(article.hasAttribute('data-selected')).toBe(true);
        expect(input.value).toBe('Keep this reply');
        expect(document.activeElement).toBe(trigger);
        await pointerDown(query('[data-outside]'));
        expect(article.hasAttribute('data-selected')).toBe(false);
        expect(container.querySelector('.omnibox-comment-reply')).toBeNull();
      } finally {
        document.removeEventListener('pointerdown', nativePointer);
      }
    }
  );

  it('preserves a real comment edit and its text while previewing another reply image', async () => {
    await act(async () => root.render(<ThreadFixture />));
    await act(async () =>
      query<HTMLButtonElement>('[aria-label="resource_comments.edit"]').click()
    );
    const input = query<HTMLTextAreaElement>(
      '.omnibox-comment-composer--edit textarea'
    );
    await enterText(input, 'Keep this edit');
    await open();
    await pointerDown(query('[role="dialog"] img'));
    expect(query('article').getAttribute('data-editing')).toBe('comment');
    expect(input.value).toBe('Keep this edit');
    await act(async () =>
      query<HTMLButtonElement>('[role="dialog"] button').click()
    );
    await settle();
    expect(query('article').getAttribute('data-editing')).toBe('comment');
    expect(
      query<HTMLTextAreaElement>('.omnibox-comment-composer--edit textarea')
    ).toBe(input);
    expect(input.value).toBe('Keep this edit');
    expect(container.querySelector('.omnibox-comment-reply')).toBeNull();
  });

  it('keeps image activation and Portal clicks from selecting an inactive thread', async () => {
    await act(async () => root.render(<ThreadFixture />));
    await pointerDown(query('[data-outside]'));
    await open();
    await act(async () => query<HTMLElement>('[role="dialog"] img').click());
    expect(query('article').hasAttribute('data-selected')).toBe(false);
    expect(container.querySelector('.omnibox-comment-reply')).toBeNull();
  });
});
