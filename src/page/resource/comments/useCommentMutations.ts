import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
} from 'react';

import type { ResourceCommentThread } from '@/interface';
import {
  createResourceComment,
  deleteResourceComment,
  deleteResourceCommentThread,
  updateResourceComment,
  updateResourceCommentThread,
  uploadResourceCommentAttachment,
} from '@/service/resourceComments';

import type { ResourceCommentEditor } from './commentAnchors';
interface UseCommentMutationsOptions {
  namespaceId: string;
  resourceId: string;
  editorRef: RefObject<ResourceCommentEditor | null>;
  anchorThreadsRef: RefObject<ResourceCommentThread[]>;
  applyThreadUpdate: (thread: ResourceCommentThread) => void;
  removeThreadLocally: (threadId: string) => void;
  setSubmitting: Dispatch<SetStateAction<boolean>>;
  setActiveThreadId: Dispatch<SetStateAction<string | null>>;
  setTotal: Dispatch<SetStateAction<number>>;
  resolved: boolean | undefined;
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
  setTotal,
  resolved,
}: UseCommentMutationsOptions) {
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
    [applyThreadUpdate, setSubmitting, setActiveThreadId]
  );

  const reply = useCallback(
    async (threadId: string, content: string, attachmentIds?: string[]) => {
      const trimmed = content.trim();
      if (!trimmed && !attachmentIds?.length) {
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
    [mutateThread, namespaceId, resourceId]
  );

  const uploadCommentImage = useCallback(
    async (file: File) => {
      return uploadResourceCommentAttachment(namespaceId, resourceId, file);
    },
    [namespaceId, resourceId]
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
          updateResourceComment(namespaceId, resourceId, threadId, commentId, {
            content: trimmed,
            attachment_ids: attachmentIds ?? [],
          }),
        threadId
      );
    },
    [mutateThread, namespaceId, resourceId, anchorThreadsRef]
  );

  const removeComment = useCallback(
    async (threadId: string, commentId: string) => {
      setSubmitting(true);
      try {
        const updated = await deleteResourceComment(
          namespaceId,
          resourceId,
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
    [
      applyThreadUpdate,
      namespaceId,
      removeThreadLocally,
      resourceId,
      setSubmitting,
    ]
  );

  const removeThread = useCallback(
    async (threadId: string) => {
      setSubmitting(true);
      try {
        await deleteResourceCommentThread(namespaceId, resourceId, threadId);
        removeThreadLocally(threadId);
      } finally {
        setSubmitting(false);
      }
    },
    [namespaceId, removeThreadLocally, resourceId, setSubmitting]
  );

  const setThreadResolved = useCallback(
    async (threadId: string, nextResolved: boolean) => {
      setSubmitting(true);
      try {
        const updated = await updateResourceCommentThread(
          namespaceId,
          resourceId,
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
    [
      applyThreadUpdate,
      namespaceId,
      resolved,
      resourceId,
      editorRef,
      setSubmitting,
      setTotal,
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
