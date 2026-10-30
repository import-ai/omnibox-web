/** @jest-environment jsdom */

import { act } from 'react';

import { USER_UPDATED_EVENT } from '@/hooks/useUser';
import type { ResourceCommentThread } from '@/interface';
import { http } from '@/lib/request';
import Render from '@/page/resource/Render';
import {
  getResourceCommentThread,
  listResourceCommentThreads,
  updateResourceComment,
  uploadResourceCommentAttachment,
} from '@/service/resourceComments';

import {
  createResourceCommentsFixture,
  resource,
  thread,
} from './ResourceCommentsTestFixture';

jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => mockApp,
}));
const mockApp = { on: () => () => undefined };

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('./resourceComments.css', () => ({}));
jest.mock('@import-ai/omnibox-editor', () => ({}));
jest.mock('./commentAnchors', () => ({}));
jest.mock('./ResourceCommentsContext', () => ({
  useResourceCommentsPanel: jest.fn(),
}));
jest.mock('./useCommentMentionUsers', () => {
  const users: unknown[] = [];
  const namesById: Record<string, string> = {};
  return {
    useCommentMentionUsers: () => ({
      users,
      namesById,
      membersById: {},
      loaded: false,
    }),
  };
});
jest.mock('@/service/resourceComments', () => ({
  getResourceCommentThread: jest.fn(),
  listResourceCommentThreads: jest.fn(),
  updateResourceComment: jest.fn(),
  uploadResourceCommentAttachment: jest.fn(),
}));
jest.mock('@/page/resource/mentionLabelSync', () => ({
  syncCommentMentionLabels: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));
jest.mock('@/components/attributes', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/components/Button', () =>
  jest.requireActual('@/components/ui/button')
);
jest.mock('@/page/resource/editor', () => ({
  __esModule: true,
  default: jest.fn(() => <span data-resource-comment-thread="thread" />),
}));
jest.mock('@/page/resource/Render', () => ({
  __esModule: true,
  default: jest.fn(() => <span data-resource-comment-thread="thread" />),
}));
jest.mock('@/page/resource/folder', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
  useSearchParams: () => [new URLSearchParams()],
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

describe('resource comment identity refresh', () => {
  const fixture = createResourceCommentsFixture();
  const { render, readonlyComments, editorProps, onResource } = fixture;
  let source: HTMLDivElement;
  let panel: HTMLDivElement;

  beforeEach(() => {
    jest.useFakeTimers();
    fixture.setup();
    ({ source, panel } = fixture);
  });

  afterEach(async () => {
    await fixture.unmount();
    jest
      .mocked(Render)
      .mockImplementation(() => <span data-resource-comment-thread="thread" />);
    jest.restoreAllMocks();
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
    jest.clearAllMocks();
    jest.useRealTimers();
    localStorage.clear();
  });

  it('refetches namespace identities on a username event without losing selection', async () => {
    localStorage.setItem('uid', 'author');
    const commentedThread: ResourceCommentThread = {
      ...thread,
      comments: ['author', 'other', 'author'].map((id, index) => ({
        id: `comment-${index}`,
        content: `Comment ${index}`,
        author: { id, username: id === 'author' ? 'Old name' : 'Other name' },
        created_at: thread.created_at,
        updated_at: thread.updated_at,
      })),
    };
    jest.mocked(listResourceCommentThreads).mockResolvedValue({
      items: [commentedThread],
      total: 1,
      has_more: false,
      offset: 0,
      limit: 20,
    });
    const commentedResource = {
      ...resource,
      comment_threads: [commentedThread],
    };
    await render(false, commentedResource);
    const initialThreads = readonlyComments().threads;
    await render(false, commentedResource);
    expect(readonlyComments().threads).toBe(initialThreads);
    await act(async () => readonlyComments().selectThread(thread.id));
    expect(readonlyComments().threads).toBe(initialThreads);
    const card = panel.querySelector('[data-thread-id="thread"]');
    const requestCount = jest.mocked(listResourceCommentThreads).mock.calls
      .length;
    expect(panel.textContent).toContain('Old name');

    jest
      .mocked(http.get)
      .mockResolvedValue({ ...resource, mention_display_names: {} });
    const renamedThread = {
      ...commentedThread,
      creator: { ...commentedThread.creator, display_name: 'New name' },
      comments: commentedThread.comments.map(comment =>
        comment.author.id === 'author'
          ? {
              ...comment,
              author: { ...comment.author, display_name: 'New name' },
            }
          : comment
      ),
    };
    jest.mocked(getResourceCommentThread).mockResolvedValue(renamedThread);
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(USER_UPDATED_EVENT, {
          detail: { username: 'New name' },
        })
      );
    });

    expect(panel.textContent).not.toContain('Old name');
    expect(panel.textContent).toContain('New name');
    expect(panel.textContent).toContain('Other name');
    expect(readonlyComments().activeThread?.creator.display_name).toBe(
      'New name'
    );
    expect(readonlyComments().activeThreadId).toBe(thread.id);
    expect(panel.querySelector('[data-thread-id="thread"]')).toBe(card);
    expect(listResourceCommentThreads).toHaveBeenCalledTimes(requestCount);
    expect(getResourceCommentThread).toHaveBeenCalledWith(
      'namespace',
      'resource',
      thread.id
    );

    const renamedThreads = readonlyComments().threads;
    const renamedActiveThread = readonlyComments().activeThread;
    await render(false, commentedResource);
    expect(readonlyComments().threads).toBe(renamedThreads);
    expect(readonlyComments().activeThread).toBe(renamedActiveThread);
    await act(async () => readonlyComments().setActiveThreadId(null));
    expect(readonlyComments().threads).toBe(renamedThreads);
    await act(async () => readonlyComments().selectThread(thread.id));
    expect(readonlyComments().threads).toBe(renamedThreads);
    expect(commentedThread.comments[0].author.username).toBe('Old name');

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(USER_UPDATED_EVENT, { detail: { username: null } })
      );
    });
    expect(panel.textContent).toContain('New name');
  });

  it('keeps a frozen author and preserves the draft baseline during identity refresh', async () => {
    localStorage.setItem('uid', 'author');
    const frozenThread: ResourceCommentThread = {
      ...thread,
      creator: { id: 'author', username: 'Frozen', display_name: 'Frozen' },
      comments: [
        {
          id: 'frozen-comment',
          content: '[@ id="gone" label="Old"]',
          author: { id: 'author', username: 'Frozen', display_name: 'Frozen' },
          created_at: thread.created_at,
          updated_at: thread.updated_at,
        },
      ],
      mention_display_names: { gone: 'Final（account）' },
    };
    jest.mocked(listResourceCommentThreads).mockResolvedValue({
      items: [frozenThread],
      total: 1,
      offset: 0,
      limit: 20,
      has_more: false,
    });
    const editable = {
      ...resource,
      current_permission: 'can_edit' as const,
      comment_threads: [frozenThread],
    };
    await render(true, editable);
    await act(async () => {
      editorProps().onContentDirtyChange(true);
    });
    jest.mocked(http.get).mockResolvedValue({
      ...editable,
      content: 'Concurrent body',
      content_hash: 'concurrent-hash',
      mention_display_names: { gone: 'Final（account）' },
    });
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(USER_UPDATED_EVENT, {
          detail: { username: 'New global name' },
        })
      );
    });
    expect(editorProps().resource.content).toBe('Quoted text');
    expect(editorProps().resource.content_hash).toBe('hash');
    expect(editorProps().comments.contentDirty).toBe(true);
    expect(
      editorProps().comments.threads[0].comments[0].author.display_name
    ).toBe('Frozen');
    expect(editorProps().comments.threads[0].comments[0].content).toContain(
      'Final（account）'
    );
    expect(onResource).not.toHaveBeenCalled();
  });

  it.each(['document', 'sidebar'] as const)(
    'preserves a second-page %s edit and pending image across identity refresh',
    async view => {
      localStorage.setItem('uid', 'author');
      const rows: ResourceCommentThread[] = Array.from(
        { length: 45 },
        (_, i): ResourceCommentThread => {
          const row = {
            ...thread,
            id: `document-${i}`,
            comments: [
              {
                id: `message-${i}`,
                author: { id: 'author', username: 'Old name' },
                content: `Original ${i}`,
                created_at: thread.created_at,
                updated_at: thread.updated_at,
              },
            ],
          };
          return view === 'document'
            ? { ...row, type: 'document', anchor: null }
            : {
                ...row,
                type: 'inline',
                anchor: {
                  from: 1,
                  to: 5,
                  prefix: '',
                  suffix: '',
                  content_hash: 'hash',
                  status: 'active',
                },
              };
        }
      );
      jest
        .mocked(listResourceCommentThreads)
        .mockImplementation(async (_ns, _id, options) => {
          const offset = options?.offset ?? 0;
          return {
            items: rows.slice(offset, offset + 20),
            total: rows.length,
            offset,
            limit: 20,
            has_more: offset + 20 < rows.length,
          };
        });
      jest
        .mocked(getResourceCommentThread)
        .mockImplementation(async (_ns, _id, id) => {
          const row = rows.find(item => item.id === id)!;
          return {
            ...row,
            creator: { ...row.creator, display_name: 'New name' },
            comments: row.comments.map(comment => ({
              ...comment,
              author: { ...comment.author, display_name: 'New name' },
            })),
          };
        });
      jest.mocked(http.get).mockResolvedValue({ mention_display_names: {} });
      let finishUpload!: (
        value: Awaited<ReturnType<typeof uploadResourceCommentAttachment>>
      ) => void;
      jest.mocked(uploadResourceCommentAttachment).mockReturnValue(
        new Promise(resolve => {
          finishUpload = resolve;
        })
      );
      await render(false, { ...resource, comment_threads: [] });
      await act(async () => {
        if (view === 'document')
          await readonlyComments().loadMoreDocumentThreads();
        else await readonlyComments().loadMore();
      });
      await act(async () => jest.advanceTimersByTime(100));
      const surface = view === 'document' ? source : panel;
      const selector =
        view === 'document'
          ? '[data-document-comment-id="document-25"]'
          : '[data-thread-id="document-25"]';
      const card = surface.querySelector(selector)!;
      expect(card).not.toBeNull();
      await act(async () =>
        card
          .querySelector<HTMLButtonElement>(
            '[aria-label="resource_comments.edit"]'
          )!
          .click()
      );
      const textarea = card.querySelector('textarea')!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          'value'
        )!.set!.call(textarea, 'Unsent second-page draft');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      });
      const imageInput =
        card.querySelector<HTMLInputElement>('input[type="file"]')!;
      Object.defineProperty(imageInput, 'files', {
        configurable: true,
        value: [new File(['image'], 'draft.png', { type: 'image/png' })],
      });
      await act(async () =>
        imageInput.dispatchEvent(new Event('change', { bubbles: true }))
      );
      const pageRequests = jest.mocked(listResourceCommentThreads).mock.calls
        .length;
      await act(async () => window.dispatchEvent(new Event('focus')));
      expect(surface.querySelector(selector)).toBe(card);
      expect(card.querySelector('textarea')).toBe(textarea);
      expect(textarea.value).toBe('Unsent second-page draft');
      expect(card.querySelector('img')?.getAttribute('src')).toBe(
        'blob:pending-image'
      );
      expect(card.textContent).toContain('New name');
      expect(listResourceCommentThreads).toHaveBeenCalledTimes(pageRequests);
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      await act(async () =>
        finishUpload({
          id: 'uploaded-image',
          url: '/uploaded.png',
          name: 'draft.png',
          mimetype: 'image/png',
          size: 5,
        })
      );
      const saved = {
        ...rows[25],
        comments: [
          { ...rows[25].comments[0], content: 'Unsent second-page draft' },
        ],
      };
      jest.mocked(updateResourceComment).mockResolvedValue(saved);
      await act(async () =>
        card
          .querySelector<HTMLButtonElement>('.omnibox-comment-submit')!
          .click()
      );
      expect(updateResourceComment).toHaveBeenCalledWith(
        'namespace',
        'resource',
        'document-25',
        'message-25',
        {
          content: 'Unsent second-page draft',
          attachment_ids: ['uploaded-image'],
        }
      );
      await act(async () => {
        if (view === 'document')
          await readonlyComments().loadMoreDocumentThreads();
        else await readonlyComments().loadMore();
      });
      expect(listResourceCommentThreads).toHaveBeenLastCalledWith(
        'namespace',
        'resource',
        expect.objectContaining({ view, offset: 40 })
      );
      if (view === 'sidebar') {
        await act(async () =>
          card.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        );
        const replyInput = card.querySelector('textarea')!;
        expect(replyInput).not.toBeNull();
        await act(async () => {
          Object.getOwnPropertyDescriptor(
            HTMLTextAreaElement.prototype,
            'value'
          )!.set!.call(replyInput, 'Unsent reply draft');
          replyInput.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await act(async () => window.dispatchEvent(new Event('focus')));
        expect(card.querySelector('textarea')).toBe(replyInput);
        expect(replyInput.value).toBe('Unsent reply draft');
        expect(readonlyComments().activeThreadId).toBe('document-25');
      } else {
        await act(async () =>
          readonlyComments().documentDraft.setContent('Unsent new comment')
        );
        await act(async () => window.dispatchEvent(new Event('focus')));
        expect(readonlyComments().documentDraft.content).toBe(
          'Unsent new comment'
        );
      }
    }
  );
});
