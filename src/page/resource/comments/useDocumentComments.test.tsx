/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { Permission, ResourceCommentThread } from '@/interface';
import * as api from '@/service/resourceComments';

import type { ResourceCommentEditor } from './commentAnchors';
import { createAnchoredCommentThread } from './createAnchoredCommentThread';
import { useResourceComments } from './useResourceComments';

jest.mock('@import-ai/omnibox-editor', () => ({}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/hooks/useUser', () => ({ USER_UPDATED_EVENT: 'user-updated' }));
jest.mock('@/page/resource/mentionLabelSync', () => ({
  syncCommentMentionLabels: jest.fn().mockResolvedValue({}),
}));
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ key: 'default', hash: '' }),
}));
jest.mock('./ResourceCommentsContext', () => ({
  useResourceCommentsPanel: () => null,
}));
jest.mock('./createAnchoredCommentThread', () => ({
  createAnchoredCommentThread: jest.fn(),
}));
jest.mock('@/service/resourceComments', () => ({
  listResourceCommentThreads: jest.fn(),
  createResourceCommentThread: jest.fn(),
  updateResourceCommentThread: jest.fn(),
  deleteResourceCommentThread: jest.fn(),
  updateResourceComment: jest.fn(),
  deleteResourceComment: jest.fn(),
  createResourceComment: jest.fn(),
  uploadResourceCommentAttachment: jest.fn(),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
Object.assign(URL, {
  createObjectURL: jest.fn(() => 'blob:image'),
  revokeObjectURL: jest.fn(),
});

const author = { id: 'author', username: 'Author' };
function thread(
  id: string,
  type: 'inline' | 'document' = 'inline',
  resolved = false
): ResourceCommentThread {
  const base = {
    id,
    quoted_text: '',
    resolved,
    creator: author,
    comments: [
      {
        id: `${id}-comment`,
        content: 'Comment',
        author,
        created_at: '2026-10-21T00:00:00Z',
        updated_at: '2026-10-21T00:00:00Z',
      },
    ],
    created_at: '2026-10-21T00:00:00Z',
    updated_at: '2026-10-21T00:00:00Z',
  };
  return type === 'document'
    ? { ...base, type, anchor: null }
    : {
        ...base,
        anchor: {
          from: 1,
          to: 2,
          prefix: '',
          suffix: '',
          status: 'active',
          content_hash: 'hash',
        },
      };
}
let controller: ReturnType<typeof useResourceComments>;
const emptyThreads: ResourceCommentThread[] = [];
function Fixture({
  resourceId = 'resource',
  dirty = false,
  permission = 'can_comment',
  namespaceId = 'namespace',
  contentHash,
}: {
  resourceId?: string;
  dirty?: boolean;
  permission?: Permission;
  namespaceId?: string;
  contentHash?: string;
}) {
  controller = useResourceComments({
    namespaceId,
    resource: {
      id: resourceId,
      current_permission: permission,
      comment_threads: emptyThreads,
      content_hash: contentHash,
    },
    enabled: true,
    contentDirty: dirty,
  });
  return null;
}

describe('document comment controller', () => {
  let root: Root;
  const render = async (props: Parameters<typeof Fixture>[0] = {}) => {
    await act(async () => root.render(<Fixture {...props} />));
  };
  beforeEach(() => {
    jest.mocked(api.updateResourceCommentThread).mockReset();
    jest.mocked(api.updateResourceComment).mockReset();
    jest.mocked(api.deleteResourceCommentThread).mockReset();
    jest.mocked(api.deleteResourceComment).mockReset();
    root = createRoot(document.createElement('div'));
    localStorage.setItem('uid', 'author');
    jest
      .mocked(api.listResourceCommentThreads)
      .mockImplementation(async (_namespace, _resource, options) => ({
        items:
          options?.view === 'document'
            ? [thread('doc', 'document')]
            : [thread('inline')],
        total: options?.view === 'document' ? 7 : 23,
        offset: options?.offset ?? 0,
        limit: 20,
        has_more: true,
      }));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('loads separate unresolved collections with server totals and independent cursors', async () => {
    await render();
    expect(api.listResourceCommentThreads).toHaveBeenCalledWith(
      'namespace',
      'resource',
      { view: 'sidebar', resolved: false, offset: 0, limit: 20 }
    );
    expect(api.listResourceCommentThreads).toHaveBeenCalledWith(
      'namespace',
      'resource',
      { view: 'document', resolved: false, offset: 0, limit: 20 }
    );
    expect(controller.total).toBe(23);
    expect(controller.documentTotal).toBe(7);
    expect(controller.threads.map(item => item.id)).toEqual(['inline']);
    expect(controller.documentThreads.map(item => item.id)).toEqual(['doc']);
    await act(async () => controller.loadMoreDocumentThreads());
    expect(api.listResourceCommentThreads).toHaveBeenLastCalledWith(
      'namespace',
      'resource',
      { view: 'document', resolved: false, offset: 1, limit: 20 }
    );
  });

  it('creates without a body hash in edit mode and does not skip server pages', async () => {
    await render({ dirty: true });
    jest.mocked(api.createResourceCommentThread).mockResolvedValue({
      thread: thread('created', 'document'),
      thread_created: true,
      comment_created: true,
    });
    let created: boolean | undefined;
    await act(async () => {
      created = await controller.createDocumentThread('  Hello  ', ['image']);
    });
    expect(created).toBe(true);
    expect(api.createResourceCommentThread).toHaveBeenCalledWith(
      'namespace',
      'resource',
      { type: 'document', content: 'Hello', attachment_ids: ['image'] }
    );
    expect(controller.documentTotal).toBe(8);
    expect(controller.total).toBe(23);
    expect(controller.commentsConfig.enabled).toBe(false);
    await act(async () => controller.loadMoreDocumentThreads());
    expect(api.listResourceCommentThreads).toHaveBeenLastCalledWith(
      'namespace',
      'resource',
      { view: 'document', resolved: false, offset: 1, limit: 20 }
    );
  });

  it('moves resolved document comments to All without changing the unresolved sidebar total', async () => {
    await render();
    jest
      .mocked(api.updateResourceCommentThread)
      .mockResolvedValue(thread('doc', 'document', true));
    await act(async () => controller.setThreadResolved('doc', true));
    expect(controller.documentThreads).toHaveLength(0);
    expect(controller.documentTotal).toBe(6);
    expect(controller.total).toBe(23);
    expect(controller.resolved).toBe(false);
    await act(async () => controller.setResolved(undefined));
    // A later reopening moves it back to the bottom collection.
    jest
      .mocked(api.updateResourceCommentThread)
      .mockResolvedValue(thread('doc', 'document'));
    await act(async () => controller.setThreadResolved('doc', false));
    expect(controller.documentThreads.map(item => item.id)).toEqual(['doc']);
    expect(controller.documentTotal).toBe(7);
    expect(controller.total).toBe(22);
  });

  it('only changes totals for collection membership when deleting a bottom comment', async () => {
    await render();
    await act(async () => controller.removeThread('doc'));
    expect(controller.documentTotal).toBe(6);
    expect(controller.total).toBe(23);
  });

  it('preserves text and one image across read/edit, retains failure, and clears success or resource changes', async () => {
    await render();
    jest.mocked(api.uploadResourceCommentAttachment).mockResolvedValue({
      id: 'image',
      url: '/image',
      name: 'image.png',
      mimetype: 'image/png',
      size: 1,
    });
    await act(async () => {
      controller.documentDraft.setContent('Draft');
      await controller.documentDraft.uploadImage(
        new File(['image'], 'image.png', { type: 'image/png' })
      );
    });
    await render({ dirty: true });
    expect(controller.documentDraft.content).toBe('Draft');
    expect(controller.documentDraft.attachmentId).toBe('image');
    jest
      .mocked(api.createResourceCommentThread)
      .mockRejectedValueOnce(new Error('Publication failed'));
    await act(async () => {
      await controller.submitDocumentDraft().catch(() => undefined);
    });
    expect(controller.documentDraft.content).toBe('Draft');
    expect(controller.documentDraft.attachmentId).toBe('image');
    jest.mocked(api.createResourceCommentThread).mockResolvedValueOnce({
      thread: thread('created', 'document'),
      thread_created: true,
      comment_created: true,
    });
    await act(async () => {
      await controller.submitDocumentDraft();
    });
    expect(controller.documentDraft.content).toBe('');
    expect(controller.documentDraft.imagePreview).toBeNull();
    await act(async () => controller.documentDraft.setContent('Another'));
    await render({ resourceId: 'another' });
    expect(controller.documentDraft.content).toBe('');
  });

  it('cancels stale image completion when a draft is canceled or its resource changes', async () => {
    await render();
    let finish!: (
      value: Awaited<ReturnType<typeof api.uploadResourceCommentAttachment>>
    ) => void;
    jest.mocked(api.uploadResourceCommentAttachment).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    let pending!: Promise<void>;
    await act(async () => {
      pending = controller.documentDraft.uploadImage(
        new File(['image'], 'image.png', { type: 'image/png' })
      );
    });
    await act(async () => controller.documentDraft.clear());
    await act(async () => {
      finish({
        id: 'stale',
        url: '/image',
        name: 'image.png',
        mimetype: 'image/png',
        size: 1,
      });
      await pending;
    });
    expect(controller.documentDraft.attachmentId).toBeNull();
    expect(controller.documentDraft.imagePreview).toBeNull();
  });

  it('ignores a publication result after leaving and returning to the same resource', async () => {
    await render();
    let finish!: (
      value: Awaited<ReturnType<typeof api.createResourceCommentThread>>
    ) => void;
    jest.mocked(api.createResourceCommentThread).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    await act(async () => controller.documentDraft.setContent('Old draft'));
    let pending!: Promise<boolean>;
    await act(async () => {
      pending = controller.submitDocumentDraft();
    });
    await render({ resourceId: 'other' });
    await render();
    await act(async () => controller.documentDraft.setContent('New draft'));
    await act(async () => {
      finish({
        thread: thread('old', 'document'),
        thread_created: true,
        comment_created: true,
      });
      await pending;
    });
    expect(controller.documentDraft.content).toBe('New draft');
    expect(controller.documentThreads.some(item => item.id === 'old')).toBe(
      false
    );
  });

  it.each(['resolve', 'edit', 'delete-thread', 'delete-comment'])(
    'ignores an old %s result after leaving and returning to the same resource',
    async action => {
      await render();
      let finish!: () => void;
      const response = new Promise<void>(resolve => {
        finish = resolve;
      });
      const outdated = thread('doc', 'document', action === 'resolve');
      outdated.comments[0].content = 'Outdated mutation';
      jest
        .mocked(api.updateResourceCommentThread)
        .mockImplementationOnce(async () => {
          await response;
          return outdated;
        });
      jest
        .mocked(api.updateResourceComment)
        .mockImplementationOnce(async () => {
          await response;
          return outdated;
        });
      jest
        .mocked(api.deleteResourceCommentThread)
        .mockReturnValueOnce(response);
      jest
        .mocked(api.deleteResourceComment)
        .mockImplementationOnce(async () => {
          await response;
          return null;
        });
      let pending!: Promise<unknown>;
      await act(async () => {
        pending =
          action === 'resolve'
            ? controller.setThreadResolved('doc', true)
            : action === 'edit'
              ? controller.editComment(
                  'doc',
                  'doc-comment',
                  'Outdated mutation'
                )
              : action === 'delete-thread'
                ? controller.removeThread('doc')
                : controller.removeComment('doc', 'doc-comment');
      });
      await render({ resourceId: 'other' });
      await render();
      await act(async () => {
        finish();
        await pending;
      });
      expect(controller.documentThreads.map(item => item.id)).toEqual(['doc']);
      expect(controller.documentThreads[0].comments[0].content).toBe('Comment');
    }
  );

  it('resets mutation state on resource changes and keeps a new request busy when an old request finishes', async () => {
    await render();
    let finishOld!: (value: ResourceCommentThread) => void;
    let finishNew!: (value: ResourceCommentThread) => void;
    jest
      .mocked(api.updateResourceCommentThread)
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finishOld = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finishNew = resolve;
          })
      );
    let oldRequest!: Promise<void>;
    await act(async () => {
      oldRequest = controller.setThreadResolved('doc', true);
    });
    expect(controller.submitting).toBe(true);
    await render({ resourceId: 'other' });
    expect(controller.submitting).toBe(false);
    let newRequest!: Promise<void>;
    await act(async () => {
      newRequest = controller.setThreadResolved('doc', true);
    });
    await act(async () => {
      finishOld(thread('doc', 'document', true));
      await oldRequest;
    });
    expect(controller.submitting).toBe(true);
    await act(async () => {
      finishNew(thread('doc', 'document', true));
      await newRequest;
    });
    expect(controller.submitting).toBe(false);
  });

  it('does not clear a new document mutation when an old inline publication finishes', async () => {
    await render({ contentHash: 'hash' });
    let finishInline!: (
      value: Awaited<ReturnType<typeof createAnchoredCommentThread>>
    ) => void;
    let finishDocument!: (value: ResourceCommentThread) => void;
    jest.mocked(createAnchoredCommentThread).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finishInline = resolve;
        })
    );
    jest.mocked(api.updateResourceCommentThread).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finishDocument = resolve;
        })
    );
    await act(async () =>
      controller.setPendingSelection({
        from: 1,
        to: 2,
        quotedText: 'Selected',
        editor: {} as ResourceCommentEditor,
      })
    );
    let inlineRequest!: Promise<boolean>;
    await act(async () => {
      inlineRequest = controller.createThread('Inline comment');
    });
    expect(controller.submitting).toBe(true);
    await render({ resourceId: 'other' });
    let documentRequest!: Promise<void>;
    await act(async () => {
      documentRequest = controller.setThreadResolved('doc', true);
    });
    await act(async () => {
      finishInline({
        thread: thread('old-inline'),
        thread_created: true,
        comment_created: true,
      });
      await inlineRequest;
    });
    expect(controller.submitting).toBe(true);
    await act(async () => {
      finishDocument(thread('doc', 'document', true));
      await documentRequest;
    });
    expect(controller.submitting).toBe(false);
  });

  describe.each(['inline', 'document'] as const)('%s permissions', type => {
    const roles: {
      permission: Permission;
      writes: boolean;
      moderates: boolean;
    }[] = [
      { permission: 'no_access', writes: false, moderates: false },
      { permission: 'can_view', writes: false, moderates: false },
      { permission: 'can_comment', writes: true, moderates: false },
      { permission: 'can_edit', writes: true, moderates: true },
      { permission: 'full_access', writes: true, moderates: true },
    ];
    describe.each(roles)('$permission', ({ permission, writes, moderates }) => {
      it.each([
        { own: true, resolved: false },
        { own: false, resolved: false },
        { own: true, resolved: true },
        { own: false, resolved: true },
      ])(
        'gates mutations for own=$own resolved=$resolved',
        async ({ own, resolved }) => {
          const item = thread('target', type, resolved);
          if (!own) {
            item.creator = { id: 'other', username: 'Other' };
            item.comments[0].author = item.creator;
          }
          jest.mocked(api.listResourceCommentThreads).mockResolvedValue({
            items: [item],
            total: 1,
            offset: 0,
            limit: 20,
            has_more: false,
          });
          jest.mocked(api.updateResourceComment).mockResolvedValue(item);
          jest.mocked(api.updateResourceCommentThread).mockResolvedValue(item);
          jest.mocked(api.deleteResourceComment).mockResolvedValue(item);
          await render({ permission });
          const canDelete = writes && (own || moderates);
          expect(controller.canDeleteComment(item.comments[0])).toBe(canDelete);
          expect(controller.canDeleteThread(item)).toBe(canDelete);
          expect(controller.canEditComment(item.comments[0])).toBe(
            writes && own
          );
          expect(controller.canModerateThread(item)).toBe(canDelete);
          await act(async () => {
            await controller.editComment(
              item.id,
              item.comments[0].id,
              'Edited',
              ['image']
            );
          });
          expect(api.updateResourceComment).toHaveBeenCalledTimes(
            writes && own && !resolved ? 1 : 0
          );
          await act(async () => {
            await controller.setThreadResolved(item.id, !resolved);
          });
          expect(api.updateResourceCommentThread).toHaveBeenCalledTimes(
            canDelete ? 1 : 0
          );
          await act(async () => {
            await controller.removeComment(item.id, item.comments[0].id);
          });
          expect(api.deleteResourceComment).toHaveBeenCalledTimes(
            canDelete ? 1 : 0
          );
          await act(async () => controller.removeThread(item.id));
          expect(api.deleteResourceCommentThread).toHaveBeenCalledTimes(
            canDelete ? 1 : 0
          );
        }
      );
    });

    it('blocks a stale edit after resolution and permits it after reopening', async () => {
      const item = thread('target', type);
      jest.mocked(api.listResourceCommentThreads).mockResolvedValue({
        items: [item],
        total: 1,
        offset: 0,
        limit: 20,
        has_more: false,
      });
      jest
        .mocked(api.updateResourceCommentThread)
        .mockResolvedValueOnce({ ...item, resolved: true })
        .mockResolvedValueOnce(item);
      jest.mocked(api.updateResourceComment).mockResolvedValue(item);
      await render();
      await act(async () => controller.setThreadResolved(item.id, true));
      await act(async () =>
        controller.editComment(item.id, item.comments[0].id, 'Blocked')
      );
      expect(api.updateResourceComment).not.toHaveBeenCalled();
      await act(async () => controller.setThreadResolved(item.id, false));
      await act(async () =>
        controller.editComment(item.id, item.comments[0].id, 'Allowed')
      );
      expect(api.updateResourceComment).toHaveBeenCalledWith(
        'namespace',
        'resource',
        item.id,
        item.comments[0].id,
        { content: 'Allowed', attachment_ids: [] }
      );
    });
  });

  it('allows viewing but gates all writes, with shared author/editor deletion', async () => {
    await render({ permission: 'can_edit', dirty: true });
    const doc = thread('other', 'document');
    const other = {
      ...doc.comments[0],
      author: { id: 'other', username: 'Other' },
    };
    expect(controller.canDeleteComment(other)).toBe(true);
    expect(controller.canModerateThread(doc)).toBe(true);
    await render({ permission: 'can_view' });
    expect(controller.canComment).toBe(false);
    expect(await controller.createDocumentThread('No')).toBe(false);
    await render({ namespaceId: 'share:shared' });
    expect(controller.canComment).toBe(false);
    expect(controller.canDeleteComment(doc.comments[0])).toBe(false);
    await act(async () => {
      await controller.setThreadResolved('doc', true);
      await controller.removeThread('doc');
      await controller.editComment('doc', 'doc-comment', 'No');
      await controller.removeComment('doc', 'doc-comment');
      await controller.reply('doc', 'No replies');
    });
    expect(api.updateResourceCommentThread).not.toHaveBeenCalled();
    expect(api.deleteResourceCommentThread).not.toHaveBeenCalled();
    expect(api.updateResourceComment).not.toHaveBeenCalled();
    expect(api.deleteResourceComment).not.toHaveBeenCalled();
    expect(api.createResourceComment).not.toHaveBeenCalled();
  });
});
