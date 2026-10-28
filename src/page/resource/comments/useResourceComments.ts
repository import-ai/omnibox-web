import {
  type OmniboxEditorCommentsConfig,
  type OmniboxEditorCommentSelection,
} from '@import-ai/omnibox-editor';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { USER_UPDATED_EVENT } from '@/hooks/useUser';
import type {
  Permission,
  ResourceComment,
  ResourceCommentAuthor,
  ResourceCommentThread,
} from '@/interface';
import { rewriteThreadMentionLabels } from '@/page/resource/mentionLabels';
import { syncCommentMentionLabels } from '@/page/resource/mentionLabelSync';

import {
  collectResourceCommentAnchors,
  type ResourceCommentAnchorSync,
  type ResourceCommentEditor,
  restoreResourceCommentAnchors,
} from './commentAnchors';
import { createAnchoredCommentThread } from './createAnchoredCommentThread';
import {
  fetchAllResourceCommentThreads,
  replaceThreadsForFilter,
} from './fetchCommentThreads';
import {
  installImageCommentPlugin,
  removeImageCommentMark,
  setActiveImageThreadId,
  setImageCommentOpener,
} from './imageCommentMarks';
import { useResourceCommentsPanel } from './ResourceCommentsContext';
import { useCommentDraftHighlight } from './useCommentDraftHighlight';
import { useCommentHighlight } from './useCommentHighlight';
import { useCommentLinkNavigation } from './useCommentLinkNavigation';
import { useCommentMentionUsers } from './useCommentMentionUsers';
import { useCommentMutations } from './useCommentMutations';
import { useCommentNavigation } from './useCommentNavigation';

function defaultResolved(
  threads: ResourceCommentThread[] | undefined
): boolean | undefined {
  return threads?.length ? false : undefined;
}

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
  onMentionContent?: (content: string, contentHash: string) => void;
}

export function useResourceComments({
  namespaceId,
  resource,
  enabled,
  contentDirty = false,
  onMentionContent,
}: UseResourceCommentsOptions) {
  const resourceRef = useRef(resource);
  resourceRef.current = resource;
  const onMentionContentRef = useRef(onMentionContent);
  onMentionContentRef.current = onMentionContent;
  const editorRef = useRef<ResourceCommentEditor | null>(null);
  const [registeredEditor, setRegisteredEditor] =
    useState<ResourceCommentEditor | null>(null);
  editorRef.current = registeredEditor;
  const anchorThreadsRef = useRef<ResourceCommentThread[]>(
    resource.comment_threads ?? []
  );
  const [anchorThreads, setAnchorThreads] = useState<ResourceCommentThread[]>(
    resource.comment_threads ?? []
  );
  const [pendingSelection, setPendingSelection] =
    useState<OmniboxEditorCommentSelection | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const panel = useResourceCommentsPanel();
  const { namesById: mentionNames, loaded: mentionNamesLoaded } =
    useCommentMentionUsers();
  const mentionNamesKey = JSON.stringify(mentionNames);
  const [fallbackPanelOpen, setFallbackPanelOpen] = useState(false);
  const panelOpen = panel?.panelOpen ?? fallbackPanelOpen;
  const setPanelOpen = panel?.setPanelOpen ?? setFallbackPanelOpen;
  const [resolved, setResolved] = useState<boolean | undefined>(() =>
    defaultResolved(resource.comment_threads)
  );
  const [commentRefreshEpoch, setCommentRefreshEpoch] = useState(0);
  const [loading, setLoading] = useState(false);
  const requestSerialRef = useRef(0);
  const panelStateRef = useRef({ open: panelOpen, resolved });
  // The filter applied while switching documents. The following resolved
  // update must not start a list refresh; the resource detail already has
  // every thread.
  const resourceSwitchResolvedRef = useRef<boolean | undefined | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createConflict, setCreateConflict] = useState(false);
  const [updatedAuthor, setUpdatedAuthor] =
    useState<ResourceCommentAuthor | null>(null);

  anchorThreadsRef.current = anchorThreads;
  const restoreEditorComments = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || editor.isDestroyed) {
      return;
    }
    restoreResourceCommentAnchors(editor, anchorThreadsRef.current);
  }, []);
  useCommentDraftHighlight(
    registeredEditor,
    pendingSelection,
    restoreEditorComments
  );

  const isShared = namespaceId.startsWith('share:');
  const permission = resource.current_permission ?? 'can_view';
  const currentUserId = localStorage.getItem('uid');
  const canComment =
    enabled && !isShared && hasPermission(permission, 'can_comment');
  const canEditResource =
    enabled && !isShared && hasPermission(permission, 'can_edit');
  const isCommentAuthor = (authorId: string | null) =>
    !!currentUserId && authorId === currentUserId;

  const withUpdatedAuthor = useCallback(
    (thread: ResourceCommentThread) => {
      if (!updatedAuthor || updatedAuthor.id !== currentUserId) {
        return thread;
      }
      return {
        ...thread,
        creator:
          thread.creator.id === updatedAuthor.id
            ? updatedAuthor
            : thread.creator,
        comments: thread.comments.map(comment =>
          comment.author.id === updatedAuthor.id
            ? { ...comment, author: updatedAuthor }
            : comment
        ),
      };
    },
    [currentUserId, updatedAuthor]
  );

  useEffect(() => {
    const handleUserUpdate = (event: Event) => {
      if (!(event instanceof CustomEvent) || !currentUserId) {
        return;
      }
      const detail: unknown = event.detail;
      if (
        typeof detail === 'object' &&
        detail !== null &&
        'username' in detail &&
        typeof detail.username === 'string'
      ) {
        setUpdatedAuthor({ id: currentUserId, username: detail.username });
      }
    };
    window.addEventListener(USER_UPDATED_EVENT, handleUserUpdate);
    return () => {
      window.removeEventListener(USER_UPDATED_EVENT, handleUserUpdate);
    };
  }, [currentUserId]);

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

  // Switching resources redraws from `comment_threads` on the resource detail
  // and does not call the comment list. Opening the panel or changing the
  // filter loads every thread for that filter, 100 at a time. A later resource
  // payload, such as a document save, still merges in.
  useEffect(() => {
    requestSerialRef.current += 1;
    setLoading(false);
    const editor = editorRef.current;
    if (editor && !editor.isDestroyed && editor.view?.dom) {
      editor.view.dom.removeAttribute('data-comment-anchors-ready');
    }
    const nextResolved = defaultResolved(resourceRef.current.comment_threads);
    resourceSwitchResolvedRef.current = nextResolved;
    setAnchorThreads(resourceRef.current.comment_threads ?? []);
    setPendingSelection(null);
    setActiveThreadId(null);
    setResolved(nextResolved);
    setCreateConflict(false);
  }, [namespaceId, resource.id]);

  useEffect(() => {
    const incoming = resource.comment_threads;
    if (!incoming) {
      return;
    }
    mergeAnchorThreads(incoming);
  }, [mergeAnchorThreads, resource.comment_threads, resource.id]);

  useEffect(() => {
    const previous = panelStateRef.current;
    const reopened = panelOpen && !previous.open;
    const filterChanged = previous.resolved !== resolved;
    const switchedWithResource =
      resourceSwitchResolvedRef.current !== null &&
      resolved === resourceSwitchResolvedRef.current;
    if (switchedWithResource) {
      resourceSwitchResolvedRef.current = null;
    }
    panelStateRef.current = { open: panelOpen, resolved };
    if (
      !enabled ||
      !panelOpen ||
      (switchedWithResource && !reopened) ||
      (!reopened && !filterChanged)
    ) {
      return;
    }
    const serial = ++requestSerialRef.current;
    const resourceId = resource.id;
    const filter = resolved;
    // Hide the current discussions behind the spinner. Keep them in memory so
    // a failed refresh can show them again.
    setLoading(true);
    fetchAllResourceCommentThreads(namespaceId, resourceId, filter)
      .then(incoming => {
        if (
          serial !== requestSerialRef.current ||
          resourceRef.current.id !== resourceId
        ) {
          return;
        }
        setAnchorThreads(current =>
          replaceThreadsForFilter(current, incoming, filter)
        );
        setCommentRefreshEpoch(epoch => epoch + 1);
        setLoading(false);
      })
      .catch(() => {
        if (serial !== requestSerialRef.current) {
          return;
        }
        setLoading(false);
      });
  }, [enabled, namespaceId, panelOpen, resolved, resource.id]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.isDestroyed) {
      return;
    }
    restoreResourceCommentAnchors(editor, anchorThreads);
  }, [anchorThreads]);

  const registerEditor = useCallback((editor: ResourceCommentEditor) => {
    installImageCommentPlugin(editor);
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

  useEffect(() => {
    setImageCommentOpener(focusThread);
    return () => setImageCommentOpener(() => undefined);
  }, [focusThread]);

  useEffect(() => {
    setActiveImageThreadId(activeThreadId);
  }, [activeThreadId]);

  useEffect(() => {
    if (contentDirty) {
      setPendingSelection(null);
    }
  }, [contentDirty]);

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
        setResolved(false);
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
    },
    [mergeAnchorThreads]
  );

  const removeThreadLocally = useCallback(
    (threadId: string) => {
      removeAnchorThread(threadId);
      setActiveThreadId(current => (current === threadId ? null : current));
      const editor = editorRef.current;
      if (editor && !editor.isDestroyed) {
        editor.commands.removeResourceComment(threadId);
        removeImageCommentMark(editor, threadId);
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

  const activeAnchorThread = activeThreadId
    ? (anchorThreads.find(thread => thread.id === activeThreadId) ?? null)
    : null;
  const activeThread = useMemo(
    () => (activeAnchorThread ? withUpdatedAuthor(activeAnchorThread) : null),
    [activeAnchorThread, withUpdatedAuthor]
  );
  const filteredThreads = useMemo(() => {
    if (resolved === undefined) {
      return anchorThreads;
    }
    return anchorThreads.filter(thread => thread.resolved === resolved);
  }, [anchorThreads, resolved]);
  const authorThreads = useMemo(
    () =>
      updatedAuthor?.id === currentUserId
        ? filteredThreads.map(withUpdatedAuthor)
        : filteredThreads,
    [currentUserId, filteredThreads, updatedAuthor, withUpdatedAuthor]
  );
  const visibleThreads = useMemo(
    () =>
      activeThread &&
      (resolved === undefined || activeThread.resolved === resolved) &&
      !authorThreads.some(thread => thread.id === activeThread.id)
        ? [...authorThreads, activeThread]
        : authorThreads,
    [activeThread, authorThreads, resolved]
  );

  useCommentHighlight({
    root: panel?.rootElement,
    activeThreadId,
    resolved: activeThread?.resolved ?? false,
  });

  useEffect(() => {
    if (!enabled || !mentionNamesLoaded || mentionNamesKey === '{}') {
      return;
    }
    if (namespaceId.startsWith('share:')) {
      return;
    }
    let ignore = false;
    syncCommentMentionLabels(namespaceId, resource.id)
      .then(result => {
        if (ignore) {
          return;
        }
        const names = JSON.parse(mentionNamesKey) as Record<string, string>;
        setAnchorThreads(current => rewriteThreadMentionLabels(current, names));
        if (
          result.content &&
          result.content_hash &&
          result.content !== resourceRef.current.content
        ) {
          onMentionContentRef.current?.(result.content, result.content_hash);
        }
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, [enabled, mentionNamesKey, mentionNamesLoaded, namespaceId, resource.id]);

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
    editor: registeredEditor,
    commentRefreshEpoch,
    createConflict,
    createThread,
    currentUserId,
    editComment,
    uploadCommentImage,
    getAnchorSync,
    loading,
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
    resourceId: resource.id,
    threads: visibleThreads,
    total: visibleThreads.length,
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
