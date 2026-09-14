import {
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
import { listResourceCommentThreads } from '@/service/resourceComments';

import {
  collectResourceCommentAnchors,
  type ResourceCommentAnchorSync,
  type ResourceCommentEditor,
  restoreResourceCommentAnchors,
} from './commentAnchors';
import { createAnchoredCommentThread } from './createAnchoredCommentThread';
import { useResourceCommentsPanel } from './ResourceCommentsContext';
import { useCommentHighlight } from './useCommentHighlight';
import { useCommentLinkNavigation } from './useCommentLinkNavigation';
import { useCommentMutations } from './useCommentMutations';
import { useCommentNavigation } from './useCommentNavigation';

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
  const [registeredEditor, setRegisteredEditor] =
    useState<ResourceCommentEditor | null>(null);
  editorRef.current = registeredEditor;
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
        const offset = append ? threadsRef.current.length : 0;
        const response = await listResourceCommentThreads(
          namespaceId,
          resource.id,
          { offset, limit: PAGE_SIZE, resolved }
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
    setAnchorThreads(resourceRef.current.comment_threads ?? []);
    setThreads([]);
    setPendingSelection(null);
    setActiveThreadId(null);
    setResolved(undefined);
    setTotal(0);
    setHasMore(false);
    setCreateConflict(false);
    requestIdRef.current += 1;
  }, [namespaceId, resource.id]);

  useEffect(() => {
    const incoming = resource.comment_threads;
    if (!incoming) {
      return;
    }
    mergeAnchorThreads(incoming);
    const updatedThreads = new Map(incoming.map(thread => [thread.id, thread]));
    setThreads(current =>
      current.map(thread => updatedThreads.get(thread.id) ?? thread)
    );
  }, [mergeAnchorThreads, resource.comment_threads, resource.id]);

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
    setRegisteredEditor(editor);
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
        setResolved(current =>
          current !== undefined && current !== thread.resolved
            ? undefined
            : current
        );
      }
    },
    [setPanelOpen]
  );

  const {
    focusThread,
    cancelNavigation,
    navigatingThreadId,
    navigatingReplyThreadId,
  } = useCommentNavigation(resource.id, openThread);

  const selectThread = useCallback(
    (threadId: string) => {
      cancelNavigation();
      setPendingSelection(null);
      setActiveThreadId(threadId);
    },
    [cancelNavigation]
  );

  const commentsConfig = useMemo<OmniboxEditorCommentsConfig>(
    () => ({
      enabled: canComment && !contentDirty,
      onCreateRequest(selection) {
        setCreateConflict(false);
        setActiveThreadId(null);
        setPendingSelection(selection);
        setPanelOpen(true);
      },
      onThreadSelect: focusThread,
    }),
    [canComment, contentDirty, focusThread, setPanelOpen]
  );

  useCommentLinkNavigation({
    enabled,
    loading,
    resourceId: resource.id,
    editorReady: !!registeredEditor && !registeredEditor.isDestroyed,
    activeThreadId,
    threads: anchorThreads,
    openThread,
    focusThread,
  });

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
        const response = await createAnchoredCommentThread({
          namespaceId,
          resourceId: resource.id,
          selection,
          contentHash,
          content: trimmed,
          attachmentIds,
        });
        mergeAnchorThreads([response.thread]);
        setResolved(undefined);
        setThreads(current => mergeThreads(current, [response.thread]));
        setTotal(current => current + (response.thread_created ? 1 : 0));
        setPendingSelection(null);
        requestAnimationFrame(() => {
          focusThread(response.thread.id, { openReply: false });
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

  const {
    reply,
    uploadCommentImage,
    editComment,
    removeComment,
    removeThread,
    setThreadResolved,
  } = useCommentMutations({
    namespaceId,
    resourceId: resource.id,
    editorRef,
    anchorThreadsRef,
    applyThreadUpdate,
    removeThreadLocally,
    setSubmitting,
    setActiveThreadId,
    setTotal,
    resolved,
  });

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

  useCommentHighlight({
    root: panel?.rootElement,
    activeThreadId,
    resolved: activeThread?.resolved ?? false,
  });

  return {
    activeThread,
    activeThreadId,
    canComment,
    canEditComment: (comment: ResourceComment) =>
      canComment && isCommentAuthor(comment.author.id),
    canDeleteComment: (comment: ResourceComment) =>
      canComment && (canEditResource || isCommentAuthor(comment.author.id)),
    canModerateThread: (thread: ResourceCommentThread) =>
      canComment && (canEditResource || isCommentAuthor(thread.creator.id)),
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
    selectThread,
    navigatingThreadId,
    navigatingReplyThreadId,
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
    threads:
      activeThread &&
      (resolved === undefined || activeThread.resolved === resolved) &&
      !threads.some(thread => thread.id === activeThread.id)
        ? [...threads, activeThread]
        : threads,
    total,
  };
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
