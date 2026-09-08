import {
  findResourceCommentRange,
  type OmniboxEditorCommentsConfig,
  type OmniboxEditorCommentSelection,
} from '@import-ai/omnibox-editor';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  Permission,
  ResourceComment,
  ResourceCommentThread,
} from '@/interface';
import {
  createResourceComment,
  createResourceCommentThread,
  deleteResourceComment,
  deleteResourceCommentThread,
  listResourceCommentThreads,
  updateResourceComment,
  updateResourceCommentThread,
  uploadResourceCommentAttachment,
} from '@/service/resourceComments';

import {
  collectResourceCommentAnchors,
  getSelectionContext,
  resolveCommentRange,
  type ResourceCommentAnchorSync,
  type ResourceCommentEditor,
  restoreResourceCommentAnchors,
} from './commentAnchors';
import { useResourceCommentsPanel } from './ResourceCommentsContext';

const PAGE_SIZE = 20;
const PERMISSIONS: Permission[] = [
  'no_access',
  'can_view',
  'can_comment',
  'can_edit',
  'full_access',
];

interface CommentableResource {
  id: string;
  content_hash?: string;
  comment_threads?: ResourceCommentThread[];
  current_permission?: Permission;
}

interface UseResourceCommentsOptions {
  namespaceId: string;
  resource: CommentableResource;
  enabled: boolean;
  contentDirty?: boolean;
}

export function useResourceComments({
  namespaceId,
  resource,
  enabled,
  contentDirty = false,
}: UseResourceCommentsOptions) {
  const resourceRef = useRef(resource);
  resourceRef.current = resource;
  const editorRef = useRef<ResourceCommentEditor | null>(null);
  const threadsRef = useRef<ResourceCommentThread[]>([]);
  const anchorThreadsRef = useRef<ResourceCommentThread[]>(
    resource.comment_threads ?? []
  );
  const requestIdRef = useRef(0);
  const [anchorThreads, setAnchorThreads] = useState<ResourceCommentThread[]>(
    resource.comment_threads ?? []
  );
  const [threads, setThreads] = useState<ResourceCommentThread[]>([]);
  const [pendingSelection, setPendingSelection] =
    useState<OmniboxEditorCommentSelection | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const panel = useResourceCommentsPanel();
  const [fallbackPanelOpen, setFallbackPanelOpen] = useState(false);
  const panelOpen = panel?.panelOpen ?? fallbackPanelOpen;
  const setPanelOpen = panel?.setPanelOpen ?? setFallbackPanelOpen;
  const [resolved, setResolved] = useState<boolean | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [createConflict, setCreateConflict] = useState(false);
  const openedHashRef = useRef<string | null>(null);

  anchorThreadsRef.current = anchorThreads;

  const isShared = namespaceId.startsWith('share:');
  const permission = resource.current_permission ?? 'can_view';
  const currentUserId = localStorage.getItem('uid');
  const canComment =
    enabled && !isShared && hasPermission(permission, 'can_comment');
  const canEditResource =
    enabled && !isShared && hasPermission(permission, 'can_edit');
  const isCommentAuthor = (authorId: string | null) =>
    !!currentUserId && authorId === currentUserId;

  const mergeAnchorThreads = useCallback(
    (incoming: ResourceCommentThread[]) => {
      setAnchorThreads(current => mergeThreads(current, incoming));
    },
    []
  );

  const removeAnchorThread = useCallback((threadId: string) => {
    setAnchorThreads(current =>
      current.filter(thread => thread.id !== threadId)
    );
  }, []);

  const loadThreads = useCallback(
    async (append = false) => {
      const requestId = ++requestIdRef.current;
      append ? setLoadingMore(true) : setLoading(true);
      try {
        const offlet = append ? threadsRef.current.length : 0;
        const response = await listResourceCommentThreads(
          namespaceId,
          resource.id,
          { offlet, limits: PAGE_SIZE, resolved }
        );
        if (requestId !== requestIdRef.current) {
          return;
        }
        setThreads(current =>
          append ? mergeThreads(current, response.items) : response.items
        );
        setTotal(response.total);
        setHasMore(response.has_more);
        mergeAnchorThreads(response.items);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [mergeAnchorThreads, namespaceId, resolved, resource.id]
  );

  threadsRef.current = threads;

  useEffect(() => {
    const incoming = resource.comment_threads ?? [];
    setAnchorThreads(incoming);
    setThreads([]);
    setPendingSelection(null);
    setActiveThreadId(null);
    setResolved(undefined);
    setTotal(0);
    setHasMore(false);
    setCreateConflict(false);
    openedHashRef.current = null;
    requestIdRef.current += 1;
  }, [resource.comment_threads, resource.id]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    loadThreads().catch(() => undefined);
  }, [enabled, loadThreads]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.isDestroyed) {
      return;
    }
    restoreResourceCommentAnchors(editor, anchorThreads);
  }, [anchorThreads]);

  const registerEditor = useCallback((editor: ResourceCommentEditor) => {
    editorRef.current = editor;
    restoreResourceCommentAnchors(editor, anchorThreadsRef.current);
  }, []);

  const openThread = useCallback(
    (threadId: string) => {
      setPendingSelection(null);
      setActiveThreadId(threadId);
      setPanelOpen(true);
      const thread = anchorThreadsRef.current.find(
        item => item.id === threadId
      );
      if (thread) {
        setResolved(undefined);
        setThreads(current => mergeThreads(current, [thread]));
      }
    },
    [setPanelOpen]
  );

  const focusAnimationRef = useRef(0);

  const alignCardWithQuote = useCallback(
    (threadId: string) => {
      const marker = panel?.rootElement?.querySelector<HTMLElement>(
        `[data-resource-comment-thread="${threadId}"]`
      );
      const card = panel?.panelElement?.querySelector<HTMLElement>(
        `[data-thread-id="${threadId}"]`
      );
      const commentsScroll = panel?.panelElement?.querySelector<HTMLElement>(
        '[data-comments-scroll]'
      );
      if (!marker || !card || !commentsScroll || !panel) {
        return false;
      }
      if (panel.commentFocusOffset !== 0) {
        panel.setCommentFocusOffset(0, false);
      }
      const wrapper =
        card.offsetParent instanceof HTMLElement ? card.offsetParent : card;
      const maxScroll = Math.max(
        0,
        commentsScroll.scrollHeight - commentsScroll.clientHeight
      );
      commentsScroll.scrollTop = Math.min(
        maxScroll,
        Math.max(
          0,
          commentsScroll.scrollTop +
            wrapper.getBoundingClientRect().top -
            marker.getBoundingClientRect().top
        )
      );
      return (
        Math.abs(
          wrapper.getBoundingClientRect().top -
            marker.getBoundingClientRect().top
        ) < 2
      );
    },
    [panel]
  );

  const focusThread = useCallback(
    (threadId: string) => {
      const editor = editorRef.current;
      if (editor && !editor.isDestroyed) {
        const range = findResourceCommentRange(editor, threadId);
        if (range) {
          editor.chain().setTextSelection(range).run();
        }
      }
      const resourceScroll = panel?.rootElement?.querySelector<HTMLElement>(
        '[data-resource-scroll]'
      );
      const marker = panel?.rootElement?.querySelector<HTMLElement>(
        `[data-resource-comment-thread="${threadId}"]`
      );
      openThread(threadId);
      cancelAnimationFrame(focusAnimationRef.current);

      const keepAligning = (attempt = 0, hits = 0) => {
        const aligned = alignCardWithQuote(threadId);
        const nextHits = aligned ? hits + 1 : 0;
        if (nextHits >= 3 || attempt >= 45) {
          return;
        }
        focusAnimationRef.current = requestAnimationFrame(() =>
          keepAligning(attempt + 1, nextHits)
        );
      };

      if (!resourceScroll || !marker) {
        requestAnimationFrame(() => keepAligning());
        return;
      }

      const scrollRect = resourceScroll.getBoundingClientRect();
      const markerRect = marker.getBoundingClientRect();
      const markerVisible =
        markerRect.bottom > scrollRect.top + 8 &&
        markerRect.top < scrollRect.bottom - 8;
      if (markerVisible) {
        requestAnimationFrame(() => keepAligning());
        return;
      }

      const startTop = resourceScroll.scrollTop;
      const nextTop = Math.max(
        0,
        startTop + markerRect.top - scrollRect.top - 24
      );
      const distance = Math.abs(nextTop - startTop);
      if (distance < 1) {
        requestAnimationFrame(() => keepAligning());
        return;
      }
      const duration = Math.min(360, Math.max(180, distance * 0.4));
      const startedAt = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - (1 - progress) * (1 - progress);
        resourceScroll.scrollTop = startTop + (nextTop - startTop) * eased;
        if (progress < 1) {
          focusAnimationRef.current = requestAnimationFrame(tick);
          return;
        }
        requestAnimationFrame(() => keepAligning());
      };
      focusAnimationRef.current = requestAnimationFrame(tick);
    },
    [alignCardWithQuote, openThread, panel]
  );

  const commentsConfig = useMemo<OmniboxEditorCommentsConfig>(
    () => ({
      enabled: canComment && !contentDirty,
      onCreateRequest(selection) {
        setCreateConflict(false);
        setActiveThreadId(null);
        setPendingSelection(selection);
      },
      onThreadSelect: focusThread,
    }),
    [canComment, contentDirty, focusThread]
  );

  useEffect(() => {
    if (!enabled || loading) {
      return;
    }
    const threadId = getCommentThreadIdFromHash(window.location.hash);
    if (!threadId || openedHashRef.current === threadId) {
      return;
    }
    const exists =
      threadsRef.current.some(thread => thread.id === threadId) ||
      anchorThreadsRef.current.some(thread => thread.id === threadId);
    if (!exists) {
      return;
    }
    openedHashRef.current = threadId;
    focusThread(threadId);
  }, [enabled, focusThread, loading, resource.id, threads]);

  const createThread = useCallback(
    async (content: string, attachmentIds?: string[]) => {
      const selection = pendingSelection;
      const contentHash = resourceRef.current.content_hash;
      const trimmed = content.trim();
      if (
        !selection ||
        !contentHash ||
        contentDirty ||
        (!trimmed && !attachmentIds?.length)
      ) {
        return false;
      }
      setSubmitting(true);
      setCreateConflict(false);
      try {
        const context = getSelectionContext(
          selection.editor,
          selection.from,
          selection.to
        );
        const response = await createResourceCommentThread(
          namespaceId,
          resource.id,
          {
            quoted_text: selection.quotedText,
            anchor_from: selection.from,
            anchor_to: selection.to,
            anchor_prefix: context.prefix,
            anchor_suffix: context.suffix,
            expected_content_hash: contentHash,
            ...(trimmed ? { content: trimmed } : {}),
            ...(attachmentIds?.length ? { attachment_ids: attachmentIds } : {}),
          }
        );
        const range = resolveCommentRange(selection.editor, selection);
        if (range) {
          selection.editor.commands.addResourceComment({
            threadId: response.thread.id,
            from: range.from,
            to: range.to,
            label: getThreadAuthorLabel(response.thread),
            commentCount: Math.max(1, response.thread.comments.length),
            secondaryLabel: getThreadSecondaryLabel(response.thread),
            labels: getThreadCommentLabels(response.thread),
          });
        }
        let anchored = await waitForCommentAnchor(
          selection.editor,
          response.thread.id
        );
        if (!anchored) {
          restoreResourceCommentAnchors(selection.editor, [response.thread]);
          anchored = await waitForCommentAnchor(
            selection.editor,
            response.thread.id
          );
        }
        mergeAnchorThreads([response.thread]);
        setResolved(undefined);
        setThreads(current => mergeThreads(current, [response.thread]));
        setTotal(current => current + (response.thread_created ? 1 : 0));
        setPendingSelection(null);
        requestAnimationFrame(() => {
          focusThread(response.thread.id);
        });
        return true;
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          error.response?.data?.code === 'resource_content_conflict'
        ) {
          setCreateConflict(true);
        }
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [
      contentDirty,
      focusThread,
      mergeAnchorThreads,
      namespaceId,
      pendingSelection,
      resource.id,
    ]
  );

  const applyThreadUpdate = useCallback(
    (updated: ResourceCommentThread) => {
      mergeAnchorThreads([updated]);
      setThreads(current => {
        if (resolved !== undefined && updated.resolved !== resolved) {
          return current.filter(thread => thread.id !== updated.id);
        }
        return mergeThreads(current, [updated]);
      });
    },
    [mergeAnchorThreads, resolved]
  );

  const removeThreadLocally = useCallback(
    (threadId: string) => {
      removeAnchorThread(threadId);
      setThreads(current => current.filter(thread => thread.id !== threadId));
      setTotal(current => Math.max(0, current - 1));
      setActiveThreadId(current => (current === threadId ? null : current));
      const editor = editorRef.current;
      if (editor && !editor.isDestroyed) {
        editor.commands.removeResourceComment(threadId);
      }
    },
    [removeAnchorThread]
  );

  const mutateThread = useCallback(
    async (
      mutation: () => Promise<ResourceCommentThread>,
      threadId: string
    ) => {
      setSubmitting(true);
      try {
        const updated = await mutation();
        applyThreadUpdate(updated);
        setActiveThreadId(threadId);
        return updated;
      } finally {
        setSubmitting(false);
      }
    },
    [applyThreadUpdate]
  );

  const reply = useCallback(
    async (threadId: string, content: string, attachmentIds?: string[]) => {
      const trimmed = content.trim();
      if (!trimmed && !attachmentIds?.length) {
        return;
      }
      return mutateThread(
        () =>
          createResourceComment(namespaceId, resource.id, threadId, {
            ...(trimmed ? { content: trimmed } : {}),
            ...(attachmentIds?.length ? { attachment_ids: attachmentIds } : {}),
          }),
        threadId
      );
    },
    [mutateThread, namespaceId, resource.id]
  );

  const uploadCommentImage = useCallback(
    async (file: File) => {
      return uploadResourceCommentAttachment(namespaceId, resource.id, file);
    },
    [namespaceId, resource.id]
  );

  const editComment = useCallback(
    async (
      threadId: string,
      commentId: string,
      content: string,
      attachmentIds?: string[]
    ) => {
      const thread = anchorThreadsRef.current.find(
        item => item.id === threadId
      );
      if (thread?.resolved) {
        return;
      }
      const trimmed = content.trim();
      return mutateThread(
        () =>
          updateResourceComment(namespaceId, resource.id, threadId, commentId, {
            content: trimmed,
            attachment_ids: attachmentIds ?? [],
          }),
        threadId
      );
    },
    [mutateThread, namespaceId, resource.id]
  );

  const removeComment = useCallback(
    async (threadId: string, commentId: string) => {
      setSubmitting(true);
      try {
        const updated = await deleteResourceComment(
          namespaceId,
          resource.id,
          threadId,
          commentId
        );
        if (updated) {
          applyThreadUpdate(updated);
        } else {
          removeThreadLocally(threadId);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [applyThreadUpdate, namespaceId, removeThreadLocally, resource.id]
  );

  const removeThread = useCallback(
    async (threadId: string) => {
      setSubmitting(true);
      try {
        await deleteResourceCommentThread(namespaceId, resource.id, threadId);
        removeThreadLocally(threadId);
      } finally {
        setSubmitting(false);
      }
    },
    [namespaceId, removeThreadLocally, resource.id]
  );

  const setThreadResolved = useCallback(
    async (threadId: string, nextResolved: boolean) => {
      setSubmitting(true);
      try {
        const updated = await updateResourceCommentThread(
          namespaceId,
          resource.id,
          threadId,
          nextResolved
        );
        applyThreadUpdate(updated);
        if (resolved !== undefined) {
          setTotal(current => Math.max(0, current - 1));
        }
        const editor = editorRef.current;
        if (editor && !editor.isDestroyed) {
          editor.commands.setResourceCommentResolved(threadId, nextResolved);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [applyThreadUpdate, namespaceId, resolved, resource.id]
  );

  const getAnchorSync = useCallback((): ResourceCommentAnchorSync => {
    const editor = editorRef.current;
    if (!editor || editor.isDestroyed) {
      return {
        comment_anchors: [],
        orphaned_comment_thread_ids: [],
      };
    }
    return collectResourceCommentAnchors(editor, anchorThreadsRef.current);
  }, []);

  const activeThread = activeThreadId
    ? (anchorThreads.find(thread => thread.id === activeThreadId) ?? null)
    : null;

  return {
    activeThread,
    activeThreadId,
    canComment,
    canEditComment: (comment: ResourceComment) =>
      !isShared && isCommentAuthor(comment.author.id),
    canDeleteComment: (comment: ResourceComment) =>
      !isShared && (canEditResource || isCommentAuthor(comment.author.id)),
    canModerateThread: (thread: ResourceCommentThread) =>
      !isShared && (canEditResource || isCommentAuthor(thread.creator.id)),
    commentsConfig,
    contentDirty,
    createConflict,
    createThread,
    currentUserId,
    editComment,
    uploadCommentImage,
    getAnchorSync,
    hasMore,
    loading,
    loadingMore,
    loadMore: () => loadThreads(true),
    openThread,
    focusThread,
    panelOpen,
    pendingSelection,
    registerEditor,
    removeComment,
    removeThread,
    reply,
    resolved,
    setActiveThreadId,
    setCreateConflict,
    setPanelOpen,
    setPendingSelection,
    setResolved,
    setThreadResolved,
    submitting,
    threads,
    total,
  };
}

export type ResourceCommentsController = ReturnType<typeof useResourceComments>;

function waitForCommentAnchor(editor: ResourceCommentEditor, threadId: string) {
  return new Promise<boolean>(resolve => {
    const hasAnchor = () =>
      !!editor.view.dom.querySelector(
        `[data-resource-comment-thread="${threadId}"]`
      );
    if (hasAnchor()) {
      resolve(true);
      return;
    }
    const finish = (found: boolean) => {
      observer.disconnect();
      window.clearTimeout(timeout);
      resolve(found);
    };
    const observer = new MutationObserver(() => {
      if (hasAnchor()) {
        finish(true);
      }
    });
    observer.observe(editor.view.dom, { childList: true, subtree: true });
    requestAnimationFrame(() => {
      if (hasAnchor()) {
        finish(true);
      }
    });
    const timeout = window.setTimeout(() => {
      finish(hasAnchor());
    }, 300);
  });
}

function getCommentThreadIdFromHash(hash: string) {
  const match = /^#comment-(.+)$/.exec(hash);
  return match?.[1] ?? null;
}

function hasPermission(current: Permission, required: Permission) {
  return PERMISSIONS.indexOf(current) >= PERMISSIONS.indexOf(required);
}

function mergeThreads(
  current: ResourceCommentThread[],
  incoming: ResourceCommentThread[]
) {
  const incomingById = new Map(incoming.map(thread => [thread.id, thread]));
  const merged = current.map(thread => incomingById.get(thread.id) ?? thread);
  const existingIds = new Set(current.map(thread => thread.id));
  return [...incoming.filter(thread => !existingIds.has(thread.id)), ...merged];
}

function getThreadAuthorLabel(thread: ResourceCommentThread) {
  const author =
    thread.creator.username || thread.comments[0]?.author.username || '?';
  return Array.from(author.trim())[0]?.toLocaleUpperCase() || '?';
}

function getThreadSecondaryLabel(thread: ResourceCommentThread) {
  const author = thread.comments[1]?.author.username || '';
  return Array.from(author.trim())[0]?.toLocaleUpperCase() || '';
}

function getThreadCommentLabels(thread: ResourceCommentThread) {
  return thread.comments
    .map(
      comment =>
        Array.from(
          comment.author.username?.trim() || '?'
        )[0]?.toLocaleUpperCase() || '?'
    )
    .join('|');
}
