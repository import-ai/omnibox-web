import { useCallback, useEffect, useRef, useState } from 'react';

import type { ResourceCommentThread } from '@/interface';
import {
  createResourceCommentThread,
  uploadResourceCommentAttachment,
} from '@/service/resourceComments';

import { useCommentDraft } from './useCommentDraft';
import { useCommentThreadCollection } from './useCommentThreadCollection';

export function useDocumentComments({
  namespaceId,
  resourceId,
  enabled,
  canComment,
  onThreads,
  onCreated,
}: {
  namespaceId: string;
  resourceId: string;
  enabled: boolean;
  canComment: boolean;
  onThreads: (threads: ResourceCommentThread[]) => void;
  onCreated: (thread: ResourceCommentThread, created: boolean) => void;
}) {
  const collection = useCommentThreadCollection({
    namespaceId,
    resourceId,
    enabled,
    view: 'document',
    resolved: false,
    onThreads,
  });
  const [submitting, setSubmitting] = useState(false);
  const lifecycleKey = `${namespaceId}:${resourceId}`;
  const scopeRef = useRef({ key: lifecycleKey, generation: 0 });
  if (scopeRef.current.key !== lifecycleKey) {
    scopeRef.current = {
      key: lifecycleKey,
      generation: scopeRef.current.generation + 1,
    };
  }
  const generation = scopeRef.current.generation;
  const submittingRef = useRef(false);
  useEffect(() => {
    submittingRef.current = false;
    setSubmitting(false);
  }, [generation]);
  const uploadImage = useCallback(
    (file: File) =>
      uploadResourceCommentAttachment(namespaceId, resourceId, file),
    [namespaceId, resourceId]
  );
  const draft = useCommentDraft(
    lifecycleKey,
    uploadImage,
    !canComment || submitting
  );
  const createThread = useCallback(
    async (content: string, attachmentIds?: string[]) => {
      const trimmed = content.trim();
      if (
        !canComment ||
        submittingRef.current ||
        (!trimmed && !attachmentIds?.length)
      )
        return false;
      submittingRef.current = true;
      setSubmitting(true);
      try {
        const response = await createResourceCommentThread(
          namespaceId,
          resourceId,
          {
            type: 'document',
            ...(trimmed ? { content: trimmed } : {}),
            ...(attachmentIds?.length ? { attachment_ids: attachmentIds } : {}),
          }
        );
        if (scopeRef.current.generation === generation) {
          collection.put(response.thread, undefined, response.thread_created);
          onCreated(response.thread, response.thread_created);
        }
        return true;
      } finally {
        if (scopeRef.current.generation === generation) {
          submittingRef.current = false;
          setSubmitting(false);
        }
      }
    },
    [canComment, generation, namespaceId, resourceId, onCreated, collection.put]
  );
  const submitDraft = useCallback(async () => {
    if (draft.uploading || !draft.hasDraft) return false;
    const created = await createThread(
      draft.content,
      draft.attachmentId ? [draft.attachmentId] : undefined
    );
    if (created && scopeRef.current.generation === generation) draft.clear();
    return created;
  }, [createThread, draft, generation]);
  return { ...collection, draft, createThread, submitDraft, submitting };
}
