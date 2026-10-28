/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { TooltipProvider } from '@/components/tooltip';
import { USER_UPDATED_EVENT } from '@/hooks/useUser';
import type { Resource, ResourceCommentThread } from '@/interface';
import { http } from '@/lib/request';
import Editor from '@/page/resource/editor';
import Page from '@/page/resource/Page';
import Render from '@/page/resource/Render';
import {
  getResourceCommentThread,
  listResourceCommentThreads,
  updateResourceComment,
  uploadResourceCommentAttachment,
} from '@/service/resourceComments';

import { useResourceCommentsPanel } from './ResourceCommentsContext';

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
jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => ({ on: () => () => undefined }),
}));
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
  useLocation: () => ({ key: 'resource', hash: '' }),
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
  comments: [],
  created_at: '2026-09-10T00:00:00Z',
  updated_at: '2026-09-10T00:00:00Z',
};
const resource: Resource = {
  id: 'resource',
  name: 'Document',
  resource_type: 'doc',
  space_type: 'private',
  parent_id: 'root',
  has_children: false,
  content: 'Quoted text',
  content_hash: 'hash',
  current_permission: 'can_comment',
  comment_threads: [thread],
};
const onResource = jest.fn();

describe('resource comments across view and edit modes', () => {
  let root: Root;
  let container: HTMLDivElement;
  let source: HTMLDivElement;
  let panel: HTMLDivElement;

  const render = async (
    editPage: boolean,
    currentResource = resource,
    isHistorical = false
  ) => {
    await act(async () => {
      root.render(
        <TooltipProvider>
          <Page
            isHistorical={isHistorical}
            editPage={editPage}
            namespaceId="namespace"
            resource={currentResource}
            showToc
            wide={false}
            onResource={onResource}
          />
        </TooltipProvider>
      );
    });
    await act(async () => jest.advanceTimersByTime(100));
  };

  const readonlyComments = () => {
    const comments = jest.mocked(Render).mock.lastCall?.[0].comments;
    if (!comments) {
      throw new Error('The page did not provide its comments to the viewer');
    }
    return comments;
  };

  const editorProps = () => {
    const props = jest.mocked(Editor).mock.lastCall?.[0];
    if (!props) {
      throw new Error('The resource editor was not mounted');
    }
    return props;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement('div');
    source = document.createElement('div');
    source.setAttribute('data-resource-scroll', '');
    panel = document.createElement('div');
    container.append(source, panel);
    document.body.append(container);
    root = createRoot(source);
    jest.mocked(useResourceCommentsPanel).mockReturnValue({
      rootElement: container,
      panelElement: panel,
      panelOpen: true,
      namespaceId: 'namespace',
      setPanelOpen: jest.fn(),
      setPanelElement: jest.fn(),
      commentFocusOffset: 0,
      setCommentFocusOffset: jest.fn(),
    });
    jest.mocked(listResourceCommentThreads).mockResolvedValue({
      items: [thread],
      total: 1,
      has_more: false,
      offset: 0,
      limit: 20,
    });
    jest.mocked(getResourceCommentThread).mockResolvedValue(thread);
    Object.assign(URL, {
      createObjectURL: jest.fn(() => 'blob:pending-image'),
      revokeObjectURL: jest.fn(),
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
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

  it('preserves the sidebar, selection, filter and scroll position without refetching', async () => {
    await render(false);
    await act(async () => readonlyComments().setResolved(false));
    await act(async () => readonlyComments().selectThread(thread.id));
    const card = panel.querySelector('[data-thread-id="thread"]');
    const scroll = panel.querySelector<HTMLElement>('[data-comments-scroll]');
    if (!card || !scroll) {
      throw new Error('The comments sidebar was not mounted');
    }
    scroll.scrollTop = 180;
    const requestCount = jest.mocked(listResourceCommentThreads).mock.calls
      .length;

    await render(true);

    expect(editorProps().comments.activeThreadId).toBe(thread.id);
    expect(editorProps().comments.resolved).toBe(false);
    expect(panel.querySelector('[data-thread-id="thread"]')).toBe(card);
    expect(panel.querySelector('[data-comments-scroll]')).toBe(scroll);
    expect(scroll.scrollTop).toBe(180);
    expect(panel.querySelector('[role="status"]')).toBeNull();
    expect(listResourceCommentThreads).toHaveBeenCalledTimes(requestCount);

    await render(false);

    expect(readonlyComments().activeThreadId).toBe(thread.id);
    expect(readonlyComments().resolved).toBe(false);
    expect(panel.querySelector('[data-thread-id="thread"]')).toBe(card);
    expect(scroll.scrollTop).toBe(180);
    expect(listResourceCommentThreads).toHaveBeenCalledTimes(requestCount);
  });

  it.each([false, true])(
    'keeps resolved document cards below the body boundary with inline cards=%s',
    async includeInline => {
      let bodyBottom = 800;
      const commentsTop = 80;
      const focusShift = -140;
      const listTop = () =>
        commentsTop -
        (panel.querySelector<HTMLElement>('[data-comments-scroll]')
          ?.scrollTop ?? 0) +
        focusShift;
      jest
        .mocked(listResourceCommentThreads)
        .mockImplementation(async (_namespace, _resource, options) => ({
          items:
            options?.view === 'document'
              ? []
              : [
                  ...(includeInline ? [thread] : []),
                  {
                    ...thread,
                    id: 'document',
                    type: 'document',
                    anchor: null,
                    resolved: true,
                  },
                ],
          total: 2,
          offset: 0,
          limit: 20,
          has_more: false,
        }));
      jest
        .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
        .mockImplementation(function (this: HTMLElement) {
          const isSidebarHeading = this.hasAttribute(
            'data-document-comments-heading'
          );
          const top = this.hasAttribute('data-resource-body-end')
            ? bodyBottom
            : this.classList.contains('resource-comments-anchored-list')
              ? listTop()
              : isSidebarHeading
                ? listTop() + (parseFloat(this.style.top) || 0)
                : this.hasAttribute('data-thread-id')
                  ? listTop() + parseFloat(this.parentElement?.style.top ?? '0')
                  : this.hasAttribute('data-comments-scroll')
                    ? commentsTop
                    : 0;
          const height = isSidebarHeading ? 41 : 120;
          return {
            x: 0,
            y: top,
            top,
            bottom:
              top + (this.hasAttribute('data-resource-body-end') ? 0 : height),
            left: 0,
            right: 300,
            width: 300,
            height,
            toJSON: () => ({}),
          };
        });
      await render(false);
      const end = document.createElement('span');
      end.setAttribute('data-resource-body-end', '');
      source.append(end);
      await act(async () => readonlyComments().setResolved(undefined));
      await act(async () => jest.advanceTimersByTime(100));
      const wrapper = () =>
        panel.querySelector<HTMLElement>('[data-thread-id="document"]')
          ?.parentElement;
      const cardTop = () =>
        panel
          .querySelector<HTMLElement>('[data-thread-id="document"]')
          ?.getBoundingClientRect().top ?? Number.NaN;
      expect(cardTop()).toBeGreaterThanOrEqual(bodyBottom + 8);
      const commentsScroll = panel.querySelector<HTMLElement>(
        '[data-comments-scroll]'
      )!;
      const beforeSidebarScroll = cardTop();
      commentsScroll.scrollTop = 75;
      await act(async () =>
        commentsScroll.dispatchEvent(new Event('scroll', { bubbles: true }))
      );
      await act(async () => jest.advanceTimersByTime(100));
      expect(cardTop()).toBe(beforeSidebarScroll - 75);
      await act(async () => readonlyComments().selectThread('document'));
      const beforeResize = cardTop();
      await act(async () => window.dispatchEvent(new Event('resize')));
      await act(async () => jest.advanceTimersByTime(100));
      expect(cardTop()).toBe(beforeResize);
      bodyBottom = 1100;
      await act(async () => window.dispatchEvent(new Event('resize')));
      await act(async () => jest.advanceTimersByTime(100));
      expect(cardTop() + commentsScroll.scrollTop).toBeGreaterThanOrEqual(
        bodyBottom + 8
      );
      if (!includeInline) {
        bodyBottom = -200;
        await act(async () =>
          source.dispatchEvent(new Event('scroll', { bubbles: true }))
        );
        await act(async () => jest.advanceTimersByTime(100));
        expect(parseFloat(wrapper()?.style.top ?? '0')).toBeLessThan(0);
      }
      jest.restoreAllMocks();
    }
  );

  it('keeps the second resolved document card centered after repeated layout updates', async () => {
    const commentsTop = 80;
    const focusShift = -140;
    const listTop = () =>
      commentsTop -
      (panel.querySelector<HTMLElement>('[data-comments-scroll]')?.scrollTop ??
        0) +
      focusShift;
    jest
      .mocked(listResourceCommentThreads)
      .mockImplementation(async (_namespace, _resource, options) => ({
        items:
          options?.view === 'document'
            ? []
            : ['document-first', 'document-second'].map((id, index) => ({
                ...thread,
                id,
                type: 'document' as const,
                anchor: null,
                resolved: true,
                created_at: `2026-09-${10 + index}T00:00:00Z`,
              })),
        total: 2,
        offset: 0,
        limit: 20,
        has_more: false,
      }));
    jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const heading = this.hasAttribute('data-document-comments-heading');
        const top = this.hasAttribute('data-resource-body-end')
          ? 400
          : this.classList.contains('resource-comments-anchored-list')
            ? listTop()
            : heading
              ? listTop() + (parseFloat(this.style.top) || 0)
              : this.hasAttribute('data-thread-id')
                ? listTop() + parseFloat(this.parentElement?.style.top ?? '0')
                : this.hasAttribute('data-comments-scroll')
                  ? commentsTop
                  : 0;
        const height = heading
          ? 41
          : this.hasAttribute('data-thread-id')
            ? 120
            : this.hasAttribute('data-resource-body-end')
              ? 0
              : this.hasAttribute('data-comments-scroll')
                ? 400
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
    await render(false);
    const boundary = document.createElement('span');
    boundary.setAttribute('data-resource-body-end', '');
    source.append(boundary);
    await act(async () => readonlyComments().setResolved(true));
    await act(async () => jest.advanceTimersByTime(100));
    const commentsScroll = panel.querySelector<HTMLElement>(
      '[data-comments-scroll]'
    )!;
    Object.defineProperties(commentsScroll, {
      clientHeight: { configurable: true, value: 400 },
      scrollHeight: { configurable: true, value: 1600 },
      scrollTo: {
        configurable: true,
        value: ({ top }: ScrollToOptions) => {
          commentsScroll.scrollTop = top ?? 0;
        },
      },
    });
    await act(async () =>
      readonlyComments().focusThread('document-second', {
        centerResolvedDocumentComment: true,
        openReply: false,
      })
    );
    await act(async () => jest.advanceTimersByTime(100));
    const card = panel.querySelector<HTMLElement>(
      '[data-thread-id="document-second"]'
    )!;
    const center = () => {
      const bounds = card.getBoundingClientRect();
      return (bounds.top + bounds.bottom) / 2;
    };
    expect(center()).toBe(280);
    const initialTop = card.parentElement?.style.top;
    for (let index = 0; index < 3; index += 1) {
      await act(async () => window.dispatchEvent(new Event('resize')));
      await act(async () => jest.advanceTimersByTime(100));
      expect(center()).toBe(280);
      expect(card.parentElement?.style.top).toBe(initialTop);
    }
    jest.restoreAllMocks();
  });

  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])(
    'labels the resolved document group below inline cards=%s with a footer title=%s',
    async (includeInline, hasFooterTitle) => {
      const documentThread = {
        ...thread,
        id: 'document',
        type: 'document' as const,
        anchor: null,
        resolved: true,
      };
      jest
        .mocked(listResourceCommentThreads)
        .mockImplementation(async (_namespace, _resource, options) => ({
          items:
            options?.view === 'document'
              ? hasFooterTitle
                ? [{ ...documentThread, id: 'unresolved', resolved: false }]
                : []
              : [...(includeInline ? [thread] : []), documentThread],
          total: 2,
          offset: 0,
          limit: 20,
          has_more: false,
        }));
      jest
        .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
        .mockImplementation(function (this: HTMLElement) {
          const isFooterHeading = this.classList.contains(
            'resource-document-comments__title'
          );
          const isSidebarHeading = this.hasAttribute(
            'data-document-comments-heading'
          );
          const top = this.hasAttribute('data-resource-body-end')
            ? 500
            : isSidebarHeading
              ? parseFloat(this.style.top) || 0
              : this.hasAttribute('data-thread-id')
                ? parseFloat(this.parentElement?.style.top ?? '0') || 0
                : this.hasAttribute('data-resource-comment-thread')
                  ? 600
                  : 0;
          const height =
            isFooterHeading || isSidebarHeading
              ? 41
              : this.hasAttribute('data-resource-body-end')
                ? 0
                : 120;
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
      await render(false);
      await act(async () => readonlyComments().setResolved(undefined));
      await act(async () => jest.advanceTimersByTime(100));

      const heading = panel.querySelector<HTMLElement>(
        '[data-document-comments-heading]'
      );
      expect(heading?.textContent).toBe('resource_comments.document_title');
      const firstCard = panel.querySelector<HTMLElement>(
        '[data-thread-id="document"]'
      )!;
      expect(firstCard.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        (heading?.getBoundingClientRect().bottom ?? Number.NaN) + 8
      );
      if (includeInline) {
        const inline = panel.querySelector<HTMLElement>(
          '[data-thread-id="thread"]'
        )!;
        expect(heading?.getBoundingClientRect().top).toBeGreaterThanOrEqual(
          inline.getBoundingClientRect().bottom + 16
        );
      } else {
        expect(heading?.getBoundingClientRect().top).toBe(500);
        if (hasFooterTitle) {
          expect(heading?.getBoundingClientRect().bottom).toBe(
            source
              .querySelector('.resource-document-comments__title')
              ?.getBoundingClientRect().bottom
          );
        }
      }
      jest.restoreAllMocks();
    }
  );

  it('omits the resolved document heading when the sidebar only has inline cards', async () => {
    await render(false);
    expect(panel.querySelector('[data-thread-id="thread"]')).not.toBeNull();
    expect(panel.querySelector('[data-document-comments-heading]')).toBeNull();
  });

  it('shares the unsaved content state with the persistent comments controller', async () => {
    await render(false);
    await render(true);
    const visibleThreads = editorProps().comments.threads;
    await act(async () => editorProps().onContentDirtyChange(true));
    expect(editorProps().comments.threads).toBe(visibleThreads);
    expect(editorProps().comments.commentsConfig.enabled).toBe(false);
    expect(panel.textContent).toContain(
      'resource_comments.save_before_commenting'
    );

    await act(async () => editorProps().onContentDirtyChange(false));
    expect(editorProps().comments.threads).toBe(visibleThreads);
    expect(editorProps().comments.commentsConfig.enabled).toBe(true);
    expect(panel.textContent).not.toContain(
      'resource_comments.save_before_commenting'
    );
  });

  it.each([undefined, false])(
    'preserves sidebar comments and the %s filter after saving the document',
    async resolved => {
      await render(false);
      await act(async () => readonlyComments().setResolved(resolved));
      const card = panel.querySelector('[data-thread-id="thread"]');
      expect(card).not.toBeNull();
      const requestCount = jest.mocked(listResourceCommentThreads).mock.calls
        .length;
      await render(true);
      const savedThread = {
        ...thread,
        anchor: { ...thread.anchor, from: 10, to: 14 },
      };

      await render(false, {
        ...resource,
        content: 'New paragraph\nQuoted text',
        content_hash: 'saved-hash',
        comment_threads: [savedThread],
      });

      expect(readonlyComments().threads).toEqual([savedThread]);
      expect(readonlyComments().total).toBe(1);
      expect(readonlyComments().resolved).toBe(resolved);
      expect(panel.querySelector('[data-thread-id="thread"]')).toBe(card);
      expect(listResourceCommentThreads).toHaveBeenCalledTimes(requestCount);
    }
  );

  it('accepts an in-flight comment list when the same resource receives a new snapshot', async () => {
    let finishLoading: (() => void) | undefined;
    jest.mocked(listResourceCommentThreads).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finishLoading = () =>
            resolve({
              items: [thread],
              total: 1,
              has_more: false,
              offset: 0,
              limit: 20,
            });
        })
    );
    await render(false);
    await render(false, { ...resource, comment_threads: [{ ...thread }] });
    await act(async () => finishLoading?.());

    expect(readonlyComments().threads).toEqual([thread]);
    expect(readonlyComments().loading).toBe(false);
    expect(panel.querySelector('[data-thread-id="thread"]')).not.toBeNull();
  });
  it('disables comments and hides live threads while previewing history', async () => {
    await render(false);
    expect(readonlyComments().canComment).toBe(true);
    await render(
      false,
      { ...resource, read_only: true, content: 'Historical' },
      true
    );
    expect(readonlyComments().canComment).toBe(false);
    expect(readonlyComments().commentsConfig.enabled).toBe(false);
    expect(jest.mocked(Render).mock.lastCall?.[0].commentsDisabled).toBe(true);
    expect(panel.textContent).toBe('');
    expect(source.querySelector('.resource-document-comments')).toBeNull();
    await render(false);
    expect(readonlyComments().canComment).toBe(true);
    expect(jest.mocked(Render).mock.lastCall?.[0].commentsDisabled).toBe(false);
    expect(source.querySelector('.resource-document-comments')).not.toBeNull();
  });

  it.each<Resource['resource_type']>(['doc', 'file', 'link', 'rss_item'])(
    'includes the footer for an empty or body-read-only %s outside the export boundary',
    async resourceType => {
      await render(false, {
        ...resource,
        resource_type: resourceType,
        content: '',
        read_only: true,
      });
      const footer = source.querySelector('.resource-document-comments');
      expect(footer).not.toBeNull();
      expect(footer?.querySelector('textarea')).not.toBeNull();
      expect(footer?.closest('[data-resource-export-content]')).toBeNull();
    }
  );

  it.each<Resource['resource_type']>(['folder', 'smart_folder', 'rss_folder'])(
    'excludes the %s footer',
    async resourceType => {
      await render(false, { ...resource, resource_type: resourceType });
      expect(source.querySelector('.resource-document-comments')).toBeNull();
    }
  );

  it('preserves the document draft through actual Page read/edit branches', async () => {
    await render(false);
    await act(async () =>
      readonlyComments().documentDraft.setContent('Preserved draft')
    );
    await render(true);
    expect(editorProps().comments.documentDraft.content).toBe(
      'Preserved draft'
    );
    expect(source.querySelector('textarea')?.value).toBe('Preserved draft');
    await render(false);
    expect(readonlyComments().documentDraft.content).toBe('Preserved draft');
  });
});
