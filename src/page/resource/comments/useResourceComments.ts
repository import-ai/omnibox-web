import {
  findResourceCommentRange,
  type OmniboxEditorCommentsConfig,
  type OmniboxEditorCommentSelection,
  selectResourceComment,
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
} from '@/service/resourceComments';

import {
  collectResourceCommentAnchors,
  getSelectionContext,
  type ResourceCommentAnchorSync,
  type ResourceCommentEditor,
  restoreResourceCommentAnchors,
} from './commentAnchors';

const PAGE_SIZE = 20;
const THREAD_SURFACE_HEIGHT = 440;
const SURFACE_WIDTH = 320;
const SURFACE_MARGIN = 12;
const SURFACE_OFFSET = 12;
const SURFACE_MIN_TOP = 56;
const THREAD_SURFACE_SELECTOR = '.omnibox-comment-surface[data-mode="thread"]';
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
  const [panelOpen, setPanelOpen] = useState(false);
  const [surfacePosition, setSurfacePosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [resolved, setResolved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [createConflict, setCreateConflict] = useState(false);

  anchorThreadsRef.current = anchorThreads;

  const permission = resource.current_permission ?? 'full_access';
  const canComment =
    enabled &&
    hasPermission(permission, 'can_comment') &&
    Boolean(resource.content_hash);
  const canEditResource = hasPermission(permission, 'can_edit');

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
    setPanelOpen(false);
    setSurfacePosition(null);
    setResolved(false);
    setTotal(0);
    setHasMore(false);
    setCreateConflict(false);
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

  const updateSurfacePosition = useCallback((threadId: string) => {
    const editor = editorRef.current;
    if (!editor || editor.isDestroyed) {
      return;
    }
    const range = findResourceCommentRange(editor, threadId);
    if (!range) {
      setSurfacePosition(getFallbackThreadSurfacePosition());
      return;
    }
    setSurfacePosition(getThreadSurfacePosition(editor, range));
  }, []);

  const openThread = useCallback(
    (threadId: string) => {
      setPendingSelection(null);
      setActiveThreadId(threadId);
      setPanelOpen(true);
      updateSurfacePosition(threadId);
      const thread = anchorThreadsRef.current.find(
        item => item.id === threadId
      );
      if (thread && !thread.resolved) {
        setResolved(false);
        setThreads(current => mergeThreads(current, [thread]));
      }
    },
    [updateSurfacePosition]
  );

  const focusThread = useCallback(
    (threadId: string) => {
      const editor = editorRef.current;
      if (editor && !editor.isDestroyed) {
        selectResourceComment(editor, threadId);
      }
      openThread(threadId);
    },
    [openThread]
  );

  useEffect(() => {
    if (!panelOpen || !activeThreadId) {
      return;
    }
    let animationFrame = 0;
    const update = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        updateSurfacePosition(activeThreadId);
      });
    };
    const surface = document.querySelector<HTMLElement>(
      THREAD_SURFACE_SELECTOR
    );
    const resizeObserver = surface ? new ResizeObserver(update) : null;
    if (surface) {
      resizeObserver?.observe(surface);
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [activeThreadId, panelOpen, updateSurfacePosition]);

  const commentsConfig = useMemo<OmniboxEditorCommentsConfig>(
    () => ({
      enabled: canComment && !contentDirty,
      onCreateRequest(selection) {
        setCreateConflict(false);
        setActiveThreadId(null);
        setPendingSelection(selection);
        setPanelOpen(false);
      },
      onThreadSelect: openThread,
    }),
    [canComment, contentDirty, openThread]
  );

  const createThread = useCallback(
    async (content: string) => {
      const selection = pendingSelection;
      const contentHash = resourceRef.current.content_hash;
      if (!selection || !contentHash || contentDirty) {
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
            content,
          }
        );
        selection.editor.commands.addResourceComment({
          threadId: response.thread.id,
          from: selection.from,
          to: selection.to,
          label: getThreadAuthorLabel(response.thread),
          commentCount: Math.max(1, response.thread.comments.length),
          secondaryLabel: getThreadSecondaryLabel(response.thread),
          labels: getThreadCommentLabels(response.thread),
        });
        mergeAnchorThreads([response.thread]);
        setResolved(false);
        setThreads(current => mergeThreads([response.thread], current));
        setTotal(current => current + (response.thread_created ? 1 : 0));
        setActiveThreadId(response.thread.id);
        setSurfacePosition(
          getThreadSurfacePosition(selection.editor, {
            from: selection.from,
            to: selection.to,
          })
        );
        setPendingSelection(null);
        setPanelOpen(true);
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
        if (updated.resolved !== resolved) {
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
      setActiveThreadId(current => {
        if (current !== threadId) {
          return current;
        }
        setPanelOpen(false);
        return null;
      });
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
    async (threadId: string, content: string) => {
      return mutateThread(
        () =>
          createResourceComment(namespaceId, resource.id, threadId, content),
        threadId
      );
    },
    [mutateThread, namespaceId, resource.id]
  );

  const editComment = useCallback(
    async (threadId: string, commentId: string, content: string) => {
      return mutateThread(
        () =>
          updateResourceComment(
            namespaceId,
            resource.id,
            threadId,
            commentId,
            content
          ),
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
        setTotal(current => Math.max(0, current - 1));
        const editor = editorRef.current;
        if (editor && !editor.isDestroyed) {
          restoreResourceCommentAnchors(editor, [updated]);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [applyThreadUpdate, namespaceId, resource.id]
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

  const currentUserId = localStorage.getItem('uid');
  const activeThread = activeThreadId
    ? (anchorThreads.find(thread => thread.id === activeThreadId) ?? null)
    : null;

  return {
    activeThread,
    activeThreadId,
    canComment,
    canEditComment: (comment: ResourceComment) =>
      canEditResource || comment.author.id === currentUserId,
    canModerateThread: (thread: ResourceCommentThread) =>
      canEditResource || thread.creator.id === currentUserId,
    commentsConfig,
    contentDirty,
    createConflict,
    createThread,
    currentUserId,
    editComment,
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
    surfacePosition,
    threads,
    total,
  };
}

function getThreadSurfacePosition(
  editor: ResourceCommentEditor,
  range: { from: number; to: number }
) {
  const start = editor.view.coordsAtPos(range.from);
  const end = editor.view.coordsAtPos(range.to);
  const surfaceWidth = Math.min(
    SURFACE_WIDTH,
    window.innerWidth - SURFACE_MARGIN * 2
  );
  const anchorCenter = (start.left + end.right) / 2;
  const left = Math.min(
    Math.max(SURFACE_MARGIN, anchorCenter - surfaceWidth / 2),
    window.innerWidth - surfaceWidth - SURFACE_MARGIN
  );
  const surfaceHeight = getThreadSurfaceHeight();
  const belowTop = end.bottom + SURFACE_OFFSET;
  const aboveTop = start.top - surfaceHeight - SURFACE_OFFSET;
  const fitsBelow =
    belowTop + surfaceHeight <= window.innerHeight - SURFACE_MARGIN;
  const fitsAbove = aboveTop >= SURFACE_MIN_TOP;
  const preferredTop = fitsBelow || !fitsAbove ? belowTop : aboveTop;
  const maxTop = Math.max(
    SURFACE_MIN_TOP,
    window.innerHeight - surfaceHeight - SURFACE_MARGIN
  );
  return {
    left,
    top: Math.min(Math.max(SURFACE_MIN_TOP, preferredTop), maxTop),
  };
}

function getFallbackThreadSurfacePosition() {
  const surfaceWidth = Math.min(
    SURFACE_WIDTH,
    window.innerWidth - SURFACE_MARGIN * 2
  );
  return {
    left: Math.max(SURFACE_MARGIN, (window.innerWidth - surfaceWidth) / 2),
    top: Math.max(
      SURFACE_MIN_TOP,
      (window.innerHeight - getThreadSurfaceHeight()) / 2
    ),
  };
}

function getThreadSurfaceHeight() {
  const measuredHeight = document
    .querySelector<HTMLElement>(THREAD_SURFACE_SELECTOR)
    ?.getBoundingClientRect().height;
  return Math.min(
    measuredHeight || THREAD_SURFACE_HEIGHT,
    window.innerHeight - SURFACE_MARGIN * 2
  );
}

export type ResourceCommentsController = ReturnType<typeof useResourceComments>;

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
