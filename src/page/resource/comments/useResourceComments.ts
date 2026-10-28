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
  isDocumentCommentThread,
  isInlineCommentThread,
  matchesCommentView,
  mergeCommentThreads,
} from './documentCommentThreads';
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
import { useCommentThreadCollection } from './useCommentThreadCollection';
import { useDocumentComments } from './useDocumentComments';

const PERMISSIONS: Permission[] = [
  'no_access',
  'can_view',
  'can_comment',
  'can_edit',
  'full_access',
];

interface CommentableResource {
  id: string;
  content?: string;
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
  const lifecycleKey = `${namespaceId}:${resource.id}`;
  const lifecycleRef = useRef({ key: lifecycleKey, generation: 0 });
  if (lifecycleRef.current.key !== lifecycleKey) {
    lifecycleRef.current = {
      key: lifecycleKey,
      generation: lifecycleRef.current.generation + 1,
    };
  }
  const generation = lifecycleRef.current.generation;
  const onMentionContentRef = useRef(onMentionContent);
  onMentionContentRef.current = onMentionContent;
  const editorRef = useRef<ResourceCommentEditor | null>(null);
  const [registeredEditor, setRegisteredEditor] =
    useState<ResourceCommentEditor | null>(null);
  editorRef.current = registeredEditor;
  const knownThreadsRef = useRef<ResourceCommentThread[]>(
    resource.comment_threads ?? []
  );
  const localThreadVersionsRef = useRef(new Map<string, number>());
  const anchorThreadsRef = useRef<ResourceCommentThread[]>(
    (resource.comment_threads ?? []).filter(isInlineCommentThread)
  );
  const [knownThreads, setKnownThreads] = useState<ResourceCommentThread[]>(
    resource.comment_threads ?? []
  );
  const anchorThreads = useMemo(
    () => knownThreads.filter(isInlineCommentThread),
    [knownThreads]
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
  const [resolved, setResolved] = useState<boolean | undefined>(false);
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
      const [withCurrentMentionLabels] = rewriteThreadMentionLabels(
        [thread],
        mentionNames
      );
      const currentThread = withCurrentMentionLabels ?? thread;
      if (!updatedAuthor || updatedAuthor.id !== currentUserId) {
        return currentThread;
      }
      return {
        ...currentThread,
        creator:
          currentThread.creator.id === updatedAuthor.id
            ? updatedAuthor
            : currentThread.creator,
        comments: currentThread.comments.map(comment =>
          comment.author.id === updatedAuthor.id
            ? { ...comment, author: updatedAuthor }
            : comment
        ),
      };
    },
    [currentUserId, mentionNames, updatedAuthor]
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

  const mergeKnownThreads = useCallback((incoming: ResourceCommentThread[]) => {
    knownThreadsRef.current = mergeCommentThreads(
      knownThreadsRef.current,
      incoming
    );
    setKnownThreads(knownThreadsRef.current);
  }, []);

  const sidebar = useCommentThreadCollection({
    namespaceId,
    resourceId: resource.id,
    enabled,
    view: 'sidebar',
    resolved,
    onThreads: mergeKnownThreads,
  });
  const onDocumentCreated = useCallback(
    (thread: ResourceCommentThread, created: boolean) => {
      mergeKnownThreads([thread]);
      sidebar.put(thread, undefined, created);
    },
    [mergeKnownThreads, sidebar.put]
  );
  const documentComments = useDocumentComments({
    namespaceId,
    resourceId: resource.id,
    enabled,
    canComment,
    onThreads: mergeKnownThreads,
    onCreated: onDocumentCreated,
  });

  useEffect(() => {
    localThreadVersionsRef.current.clear();
    knownThreadsRef.current = resourceRef.current.comment_threads ?? [];
    setKnownThreads(knownThreadsRef.current);
    setPendingSelection(null);
    setActiveThreadId(null);
    setResolved(false);
    setCreateConflict(false);
  }, [namespaceId, resource.id]);

  useEffect(() => {
    const incoming = resource.comment_threads;
    if (!incoming) {
      return;
    }
    if (incoming.every(thread => knownThreadsRef.current.includes(thread)))
      return;
    incoming.forEach(thread => {
      const previous = knownThreadsRef.current.find(
        item => item.id === thread.id
      );
      sidebar.put(thread, previous);
      documentComments.put(thread, previous);
    });
    mergeKnownThreads(incoming);
  }, [
    mergeKnownThreads,
    resource.comment_threads,
    resource.id,
    sidebar.put,
    documentComments.put,
  ]);

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
      const thread = knownThreadsRef.current.find(item => item.id === threadId);
      if (thread && isDocumentCommentThread(thread) && !thread.resolved) return;
      setPanelOpen(true);
      if (thread && isDocumentCommentThread(thread)) {
        setResolved(current => (current === false ? true : current));
      } else if (thread) {
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
  } = useCommentNavigation(lifecycleKey, openThread, threadId =>
    knownThreadsRef.current.find(thread => thread.id === threadId)
  );

  const selectThread = useCallback(
    (threadId: string) => {
      cancelNavigation();
      setPendingSelection(null);
      setActiveThreadId(threadId);
    },
    [cancelNavigation]
  );

  const removeThreadLocally = useCallback(
    (threadId: string) => {
      localThreadVersionsRef.current.set(
        threadId,
        (localThreadVersionsRef.current.get(threadId) ?? 0) + 1
      );
      const previous = knownThreadsRef.current.find(
        thread => thread.id === threadId
      );
      knownThreadsRef.current = knownThreadsRef.current.filter(
        thread => thread.id !== threadId
      );
      setKnownThreads(knownThreadsRef.current);
      sidebar.remove(threadId, previous);
      documentComments.remove(threadId, previous);
      setActiveThreadId(current => (current === threadId ? null : current));
      const editor = editorRef.current;
      if (
        previous &&
        isInlineCommentThread(previous) &&
        editor &&
        !editor.isDestroyed
      ) {
        editor.commands.removeResourceComment(threadId);
        removeImageCommentMark(editor, threadId);
      }
    },
    [sidebar.remove, documentComments.remove]
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
    const active = knownThreads.find(thread => thread.id === activeThreadId);
    setActiveImageThreadId(
      active && isInlineCommentThread(active) ? active.id : null
    );
  }, [activeThreadId, knownThreads]);

  useEffect(() => {
    if (contentDirty) {
      setPendingSelection(null);
    }
  }, [contentDirty]);

  useCommentLinkNavigation({
    enabled,
    loading: sidebar.loading,
    namespaceId,
    resourceId: resource.id,
    editorReady: !!registeredEditor && !registeredEditor.isDestroyed,
    activeThreadId,
    threads: knownThreads,
    getTargetVersion: threadId =>
      localThreadVersionsRef.current.get(threadId) ?? 0,
    onTarget: (thread, requestVersion) => {
      // Local actions supersede a pending link; later lookups accept fresh server state.
      if (
        (localThreadVersionsRef.current.get(thread.id) ?? 0) !== requestVersion
      )
        return null;
      const previous = knownThreadsRef.current.find(
        item => item.id === thread.id
      );
      mergeKnownThreads([thread]);
      sidebar.put(thread);
      documentComments.put(thread);
      if (previous && previous.resolved !== thread.resolved) {
        // A remote transition may already be reflected in one collection's total.
        void sidebar.load().catch(() => undefined);
        void documentComments.load().catch(() => undefined);
      }
      return thread;
    },
    onUnavailable: (threadId, requestVersion) => {
      if (
        (localThreadVersionsRef.current.get(threadId) ?? 0) !== requestVersion
      )
        return;
      removeThreadLocally(threadId);
      // Reload authoritative totals after a remote deletion or permission change.
      void sidebar.load().catch(() => undefined);
      void documentComments.load().catch(() => undefined);
    },
    openThread,
    focusThread,
  });

  const createThread = useCallback(
    async (content: string, attachmentIds?: string[]) => {
      const selection = pendingSelection;
      const contentHash = resourceRef.current.content_hash;
      const trimmed = content.trim();
      if (
        !canComment ||
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
        if (lifecycleRef.current.generation !== generation) return true;
        const previous = knownThreadsRef.current.find(
          thread => thread.id === response.thread.id
        );
        mergeKnownThreads([response.thread]);
        sidebar.put(response.thread, previous, response.thread_created);
        setResolved(false);
        setPendingSelection(null);
        requestAnimationFrame(() => {
          if (lifecycleRef.current.generation === generation)
            focusThread(response.thread.id, { openReply: false });
        });
        return true;
      } catch (error) {
        if (
          lifecycleRef.current.generation === generation &&
          axios.isAxiosError(error) &&
          error.response?.data?.code === 'resource_content_conflict'
        ) {
          setCreateConflict(true);
        }
        throw error;
      } finally {
        if (lifecycleRef.current.generation === generation)
          setSubmitting(false);
      }
    },
    [
      contentDirty,
      canComment,
      generation,
      focusThread,
      mergeKnownThreads,
      namespaceId,
      pendingSelection,
      sidebar.put,
      resource.id,
    ]
  );

  const applyThreadUpdate = useCallback(
    (updated: ResourceCommentThread) => {
      localThreadVersionsRef.current.set(
        updated.id,
        (localThreadVersionsRef.current.get(updated.id) ?? 0) + 1
      );
      const previous = knownThreadsRef.current.find(
        thread => thread.id === updated.id
      );
      mergeKnownThreads([updated]);
      sidebar.put(updated, previous);
      documentComments.put(updated, previous);
    },
    [mergeKnownThreads, sidebar.put, documentComments.put]
  );

  const canEditComment = (comment: ResourceComment) =>
    canComment && isCommentAuthor(comment.author.id);
  const canDeleteComment = (comment: ResourceComment) =>
    canComment && (isCommentAuthor(comment.author.id) || canEditResource);
  const canModerateThread = (thread: ResourceCommentThread) =>
    canComment && (canEditResource || isCommentAuthor(thread.creator.id));
  const canDeleteThread = (thread: ResourceCommentThread) =>
    canComment && (isCommentAuthor(thread.creator.id) || canEditResource);

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
    anchorThreadsRef: knownThreadsRef,
    applyThreadUpdate,
    removeThreadLocally,
    setSubmitting,
    setActiveThreadId,
    canComment,
    canEditComment,
    canDeleteComment,
    canModerateThread,
    canDeleteThread,
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
    ? (knownThreads.find(thread => thread.id === activeThreadId) ?? null)
    : null;
  const activeThread = useMemo(
    () => (activeAnchorThread ? withUpdatedAuthor(activeAnchorThread) : null),
    [activeAnchorThread, withUpdatedAuthor]
  );
  const authorThreads = useMemo(
    () =>
      updatedAuthor?.id === currentUserId
        ? sidebar.threads.map(withUpdatedAuthor)
        : sidebar.threads,
    [currentUserId, sidebar.threads, updatedAuthor, withUpdatedAuthor]
  );
  const visibleThreads = useMemo(
    () =>
      activeThread &&
      matchesCommentView(activeThread, 'sidebar', resolved) &&
      !authorThreads.some(thread => thread.id === activeThread.id)
        ? mergeCommentThreads(authorThreads, [activeThread], true)
        : authorThreads,
    [activeThread, authorThreads, resolved]
  );

  useCommentHighlight({
    root: panel?.rootElement,
    activeThreadId:
      activeThread && isInlineCommentThread(activeThread)
        ? activeThreadId
        : null,
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
        const rewrittenThreads = rewriteThreadMentionLabels(
          knownThreadsRef.current,
          names
        );
        knownThreadsRef.current = rewrittenThreads;
        setKnownThreads(rewrittenThreads);
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
    canEditComment,
    canDeleteComment,
    canModerateThread,
    canDeleteThread,
    commentsConfig,
    contentDirty,
    editor: registeredEditor,
    createConflict,
    createThread,
    currentUserId,
    editComment,
    uploadCommentImage,
    getAnchorSync,
    hasMore: sidebar.hasMore,
    loading: sidebar.loading,
    loadingMore: sidebar.loadingMore,
    loadMore: () => sidebar.load(true),
    documentThreads: documentComments.threads.map(withUpdatedAuthor),
    documentTotal: documentComments.total,
    documentLoading: documentComments.loading,
    documentLoadingMore: documentComments.loadingMore,
    documentHasMore: documentComments.hasMore,
    loadMoreDocumentThreads: () => documentComments.load(true),
    createDocumentThread: documentComments.createThread,
    documentDraft: documentComments.draft,
    submitDocumentDraft: documentComments.submitDraft,
    documentSubmitting: documentComments.submitting,
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
    threads: visibleThreads,
    total: sidebar.total,
  };
}

export type ResourceCommentsController = ReturnType<typeof useResourceComments>;

function hasPermission(current: Permission, required: Permission) {
  return PERMISSIONS.indexOf(current) >= PERMISSIONS.indexOf(required);
}
