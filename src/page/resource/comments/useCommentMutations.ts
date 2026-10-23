import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from 'react';

import type { ResourceComment, ResourceCommentThread } from '@/interface';
import {
  createResourceComment,
  deleteResourceComment,
  deleteResourceCommentThread,
  updateResourceComment,
  updateResourceCommentThread,
  uploadResourceCommentAttachment,
} from '@/service/resourceComments';

import type { ResourceCommentEditor } from './commentAnchors';
import { isInlineCommentThread } from './documentCommentThreads';
import { setImageCommentResolved } from './imageCommentMarks';
interface UseCommentMutationsOptions {
  namespaceId: string;
  resourceId: string;
  editorRef: RefObject<ResourceCommentEditor | null>;
  anchorThreadsRef: RefObject<ResourceCommentThread[]>;
  applyThreadUpdate: (thread: ResourceCommentThread) => void;
  removeThreadLocally: (threadId: string) => void;
  setSubmitting: Dispatch<SetStateAction<boolean>>;
  setActiveThreadId: Dispatch<SetStateAction<string | null>>;
  canComment: boolean;
  canEditComment: (comment: ResourceComment) => boolean;
  canDeleteComment: (
    comment: ResourceComment,
    thread?: ResourceCommentThread
  ) => boolean;
  canModerateThread: (thread: ResourceCommentThread) => boolean;
  canDeleteThread: (thread: ResourceCommentThread) => boolean;
}
export function useCommentMutations({
  namespaceId,
  resourceId,
  editorRef,
  anchorThreadsRef,
  applyThreadUpdate,
  removeThreadLocally,
  setSubmitting,
  setActiveThreadId,
  canComment,
  canEditComment,
  canDeleteComment,
  canModerateThread,
  canDeleteThread,
}: UseCommentMutationsOptions) {
  const scope = `${namespaceId}:${resourceId}`;
  const lifecycleRef = useRef({ scope, generation: 0 });
  if (lifecycleRef.current.scope !== scope) {
    lifecycleRef.current = {
      scope,
      generation: lifecycleRef.current.generation + 1,
    };
  }
  const generation = lifecycleRef.current.generation;
  const pendingRef = useRef(0);
  useEffect(() => {
    pendingRef.current = 0;
    setSubmitting(false);
  }, [generation, setSubmitting]);
  const beginMutation = useCallback(() => {
    pendingRef.current += 1;
    setSubmitting(true);
  }, [setSubmitting]);
  const endMutation = useCallback(() => {
    if (lifecycleRef.current.generation !== generation) return;
    pendingRef.current = Math.max(0, pendingRef.current - 1);
    setSubmitting(pendingRef.current > 0);
  }, [generation, setSubmitting]);
  const mutateThread = useCallback(
    async (
      mutation: () => Promise<ResourceCommentThread>,
      threadId: string
    ) => {
      beginMutation();
      try {
        const updated = await mutation();
        if (lifecycleRef.current.generation === generation) {
          applyThreadUpdate(updated);
          setActiveThreadId(threadId);
        }
        return updated;
      } finally {
        endMutation();
      }
    },
    [
      applyThreadUpdate,
      beginMutation,
      endMutation,
      setActiveThreadId,
      generation,
    ]
  );

  const reply = useCallback(
    async (threadId: string, content: string, attachmentIds?: string[]) => {
      const trimmed = content.trim();
      const thread = anchorThreadsRef.current.find(
        item => item.id === threadId
      );
      if (
        !canComment ||
        !thread ||
        !isInlineCommentThread(thread) ||
        thread.resolved ||
        (!trimmed && !attachmentIds?.length)
      ) {
        return;
      }
      return mutateThread(
        () =>
          createResourceComment(namespaceId, resourceId, threadId, {
            ...(trimmed ? { content: trimmed } : {}),
            ...(attachmentIds?.length ? { attachment_ids: attachmentIds } : {}),
          }),
        threadId
      );
    },
    [mutateThread, namespaceId, resourceId, anchorThreadsRef, canComment]
  );

  const uploadCommentImage = useCallback(
    async (file: File) => {
      if (!canComment) throw new Error('Comment permission required');
      return uploadResourceCommentAttachment(namespaceId, resourceId, file);
    },
    [namespaceId, resourceId, canComment]
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
      const comment = thread?.comments.find(item => item.id === commentId);
      if (
        !thread ||
        !comment ||
        !canEditComment(comment) ||
        (isInlineCommentThread(thread) && thread.resolved)
      ) {
        return;
      }
      const trimmed = content.trim();
      return mutateThread(
        () =>
          updateResourceComment(namespaceId, resourceId, threadId, commentId, {
            content: trimmed,
            attachment_ids: attachmentIds ?? [],
          }),
        threadId
      );
    },
    [mutateThread, namespaceId, resourceId, anchorThreadsRef, canEditComment]
  );

  const removeComment = useCallback(
    async (threadId: string, commentId: string) => {
      const thread = anchorThreadsRef.current.find(
        item => item.id === threadId
      );
      const comment = thread?.comments.find(item => item.id === commentId);
      if (!thread || !comment || !canDeleteComment(comment, thread)) return;
      beginMutation();
      try {
        const updated = await deleteResourceComment(
          namespaceId,
          resourceId,
          threadId,
          commentId
        );
        if (lifecycleRef.current.generation !== generation) return;
        if (updated) {
          applyThreadUpdate(updated);
        } else {
          removeThreadLocally(threadId);
        }
      } finally {
        endMutation();
      }
    },
    [
      applyThreadUpdate,
      namespaceId,
      removeThreadLocally,
      resourceId,
      beginMutation,
      endMutation,
      anchorThreadsRef,
      canDeleteComment,
      generation,
    ]
  );

  const removeThread = useCallback(
    async (threadId: string) => {
      const thread = anchorThreadsRef.current.find(
        item => item.id === threadId
      );
      if (!thread || !canDeleteThread(thread)) return;
      beginMutation();
      try {
        await deleteResourceCommentThread(namespaceId, resourceId, threadId);
        if (lifecycleRef.current.generation === generation)
          removeThreadLocally(threadId);
      } finally {
        endMutation();
      }
    },
    [
      namespaceId,
      removeThreadLocally,
      resourceId,
      beginMutation,
      endMutation,
      anchorThreadsRef,
      canDeleteThread,
      generation,
    ]
  );

  const setThreadResolved = useCallback(
    async (threadId: string, nextResolved: boolean) => {
      const thread = anchorThreadsRef.current.find(
        item => item.id === threadId
      );
      if (!thread || !canModerateThread(thread)) return;
      beginMutation();
      try {
        const updated = await updateResourceCommentThread(
          namespaceId,
          resourceId,
          threadId,
          nextResolved
        );
        if (lifecycleRef.current.generation !== generation) return;
        applyThreadUpdate(updated);
        const editor = editorRef.current;
        if (isInlineCommentThread(updated) && editor && !editor.isDestroyed) {
          editor.commands.setResourceCommentResolved(threadId, nextResolved);
          setImageCommentResolved(editor, threadId, nextResolved);
        }
      } finally {
        endMutation();
      }
    },
    [
      applyThreadUpdate,
      namespaceId,
      resourceId,
      editorRef,
      beginMutation,
      endMutation,
      anchorThreadsRef,
      canModerateThread,
      generation,
    ]
  );

  return {
    reply,
    uploadCommentImage,
    editComment,
    removeComment,
    removeThread,
    setThreadResolved,
  };
}
