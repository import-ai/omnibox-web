/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { TooltipProvider } from '@/components/tooltip';
import type { ResourceDocumentCommentThread } from '@/interface';

import { ResourceCommentThreadItem } from './ResourceCommentThreadItem';
import { ResourceDocumentComments } from './ResourceDocumentComments';
import type { ResourceCommentsController } from './useResourceComments';
jest.mock('react', () => {
  const react = jest.requireActual('react');
  return { ...react, default: react };
});
jest.mock('@/components/button', () =>
  jest.requireActual('@/components/ui/button')
);
jest.mock('@/lib/captcha', () => ({}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: class {
    observe() {}
    disconnect() {}
    unobserve() {}
  },
});
const thread: ResourceDocumentCommentThread = {
  id: 'document',
  type: 'document',
  anchor: null,
  quoted_text: '',
  resolved: false,
  creator: { id: 'author', username: 'Author' },
  comments: [
    {
      id: 'comment',
      content: 'Document feedback',
      author: { id: 'author', username: 'Author' },
      created_at: '2026-10-21T00:00:00Z',
      updated_at: '2026-10-21T00:00:00Z',
    },
  ],
  created_at: '2026-10-21T00:00:00Z',
  updated_at: '2026-10-21T00:00:00Z',
};
function controller(
  overrides: Partial<ResourceCommentsController> = {}
): ResourceCommentsController {
  return {
    documentThreads: [],
    canComment: true,
    documentHasMore: false,
    documentSubmitting: false,
    submitting: false,
    documentDraft: {
      content: '',
      setContent: jest.fn(),
      hasDraft: false,
      imagePreview: null,
      attachmentId: null,
      uploading: false,
      clear: jest.fn(),
      clearImage: jest.fn(),
      uploadImage: jest.fn(),
    },
    submitDocumentDraft: jest.fn(async () => true),
    setThreadResolved: jest.fn(async () => undefined),
    canEditComment: () => true,
    canDeleteComment: () => true,
    canModerateThread: () => true,
    removeComment: jest.fn(async () => undefined),
    selectThread: jest.fn(),
    setActiveThreadId: jest.fn(),
    focusThread: jest.fn(),
    threads: [thread],
    activeThreadId: null,
    currentUserId: 'author',
    ...overrides,
  } as ResourceCommentsController;
}
describe('full document comment presentation', () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.clearAllMocks();
  });
  async function render(value = controller()) {
    await act(async () =>
      root.render(
        <TooltipProvider>
          <ResourceDocumentComments controller={value} />
        </TooltipProvider>
      )
    );
  }
  const button = (key: string) =>
    [...container.querySelectorAll<HTMLButtonElement>('button')].find(
      item => item.getAttribute('aria-label') === 'resource_comments.' + key
    );
  it('keeps only the composer when there are no unresolved comments', async () => {
    await render();
    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelector('textarea')).not.toBeNull();
    expect(container.querySelector('button[type=submit]')).toBeNull();
    const boundary = container.querySelector('[data-resource-body-end]');
    expect(boundary).not.toBeNull();
  });
  it('reveals draft actions and reuses cancel and publish without focusing on a row click', async () => {
    const value = controller({ documentThreads: [thread] });
    value.documentDraft = {
      ...value.documentDraft,
      content: 'Draft',
      hasDraft: true,
    };
    await render(value);
    expect(container.querySelector('h1')?.textContent).toBe(
      'resource_comments.document_title'
    );
    expect(container.querySelector('[data-resource-body-end]')).not.toBeNull();
    expect(container.querySelector('[data-resource-body-end]')).toBe(
      container.querySelector('h1')
    );
    expect(container.querySelector('button[type=submit]')).not.toBeNull();
    await act(async () =>
      container
        .querySelector<HTMLElement>('[data-document-comment-id]')
        ?.click()
    );
    expect(document.activeElement).not.toBe(
      container.querySelector('textarea')
    );
    expect(value.selectThread).not.toHaveBeenCalled();
    await act(async () =>
      container
        .querySelector('form')
        ?.dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true })
        )
    );
    expect(value.submitDocumentDraft).toHaveBeenCalledTimes(1);
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-comment-cancel]')
        ?.click()
    );
    expect(value.documentDraft.clear).toHaveBeenCalledTimes(1);
  });
  it('offers exactly the four bottom actions and no replies or navigation', async () => {
    const value = controller({ documentThreads: [thread] });
    await render(value);
    const row = container.querySelector('[data-document-comment-id]')!;
    expect(
      [...row.querySelectorAll('button[aria-label]')].map(item =>
        item.getAttribute('aria-label')
      )
    ).toEqual([
      'resource_comments.copy_thread_link',
      'resource_comments.resolve_and_hide',
      'resource_comments.edit',
      'resource_comments.delete',
    ]);
    const toolbar = row.querySelector('.omnibox-comment-message__meta');
    expect(
      [...(toolbar?.querySelectorAll('button[aria-label]') ?? [])].map(item =>
        item.getAttribute('aria-label')
      )
    ).toEqual([
      'resource_comments.copy_thread_link',
      'resource_comments.resolve_and_hide',
      'resource_comments.edit',
      'resource_comments.delete',
    ]);
    expect(row.querySelector('.omnibox-comment-thread__toolbar')).toBeNull();
    expect(
      [...row.querySelectorAll('button[aria-label]')].every(item =>
        item.classList.contains('omnibox-comment-message__action')
      )
    ).toBe(true);
    expect(
      button('edit')?.closest('.omnibox-comment-message__meta')
    ).not.toBeNull();
    expect(
      button('delete')?.closest('.omnibox-comment-message__meta')
    ).not.toBeNull();
    await act(async () => button('resolve_and_hide')?.click());
    expect(value.setThreadResolved).toHaveBeenCalledWith('document', true);
    expect(container.querySelector('.omnibox-comment-reply')).toBeNull();
  });
  it('hides author actions and writes for viewers and shares', async () => {
    await render(
      controller({
        documentThreads: [thread],
        canComment: false,
        canEditComment: () => false,
        canDeleteComment: () => false,
        canModerateThread: () => false,
      })
    );
    expect(container.querySelector('textarea')).toBeNull();
    expect(container.querySelectorAll('button')).toHaveLength(1);
    expect(button('copy_thread_link')).toBeDefined();
  });
  it('uses the resolved quote, selection attributes and bounded navigation without replies or edit', async () => {
    const resolved = { ...thread, resolved: true };
    const value = controller({
      activeThreadId: thread.id,
      threads: [resolved],
    });
    await act(async () =>
      root.render(
        <TooltipProvider>
          <ResourceCommentThreadItem
            controller={value}
            mode={'all'}
            thread={resolved}
            orderedThreadIds={[thread.id]}
          />
        </TooltipProvider>
      )
    );
    expect(container.querySelector('q')?.textContent).toBe(
      'resource_comments.document_quote'
    );
    expect(
      container.querySelector('article')?.hasAttribute('data-selected')
    ).toBe(true);
    expect(
      container.querySelector('article')?.hasAttribute('data-resolved')
    ).toBe(true);
    expect(button('previous_thread')?.disabled).toBe(true);
    expect(button('next_thread')?.disabled).toBe(true);
    expect(button('edit')).toBeUndefined();
    expect(container.querySelector('textarea')).toBeNull();
  });
});
