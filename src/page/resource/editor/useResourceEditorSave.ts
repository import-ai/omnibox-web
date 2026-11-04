import {
  type OmniboxEditorCommentSelection,
  tiptapJsonToMarkdown,
} from '@import-ai/omnibox-editor';
import { useCallback, useEffect, useRef } from 'react';

import type App from '@/hooks/app.class';
import type { Resource } from '@/interface';
import { http } from '@/lib/request';
import type { ResourceCommentAnchorSync } from '@/page/resource/comments/commentAnchors';

import { buildResourceUpdate } from './buildResourceUpdate';
import { clearCache } from './cache';
import { isDocumentChanged } from './contentComparison';
import { updateResourceEditorDraft } from './draftCache';
import type { EditBaseline } from './editBaseline';

type BodyEditor = OmniboxEditorCommentSelection['editor'];

interface UseResourceEditorSaveInput {
  app: App;
  baselineRef: { current: EditBaseline | null };
  bodyEditorRef: { current: BodyEditor | null };
  contentHash?: string;
  getAnchorSync: () => ResourceCommentAnchorSync;
  locationState: unknown;
  namespaceId: string;
  navigate: (path: string, options?: { state?: unknown }) => void;
  onContentDirtyChange: (dirty: boolean) => void;
  onResource: (resource: Resource) => void;
  resourceId: string;
  title: string;
}

function serializedEditorContent(editor: BodyEditor) {
  return tiptapJsonToMarkdown(editor.getJSON());
}

export function useResourceEditorSave({
  app,
  baselineRef,
  bodyEditorRef,
  contentHash,
  getAnchorSync,
  locationState,
  namespaceId,
  navigate,
  onContentDirtyChange,
  onResource,
  resourceId,
  title,
}: UseResourceEditorSaveInput) {
  const savingRef = useRef(false);

  const finishEditing = useCallback(
    (onSuccess?: () => void) => {
      baselineRef.current = null;
      onContentDirtyChange(false);
      clearCache(resourceId);
      navigate(`/${namespaceId}/${resourceId}`, { state: locationState });
      onSuccess?.();
    },
    [
      baselineRef,
      locationState,
      namespaceId,
      navigate,
      onContentDirtyChange,
      resourceId,
    ]
  );

  const save = useCallback(
    (onSuccess?: () => void) => {
      const baseline = baselineRef.current;
      const editor = bodyEditorRef.current;
      if (savingRef.current || !baseline || !editor || editor.isDestroyed) {
        return;
      }

      const currentDocument = editor.getJSON();
      const decision = buildResourceUpdate({
        baselineName: baseline.originalName,
        baselineDocument: baseline.comparableDocument,
        currentName: title,
        currentDocument,
        getCurrentContent: () => serializedEditorContent(editor),
        contentHash,
        anchorSync: contentHash ? getAnchorSync() : null,
      });
      if (!decision.changed) {
        finishEditing(onSuccess);
        return;
      }

      savingRef.current = true;
      http
        .patch(
          `/namespaces/${namespaceId}/resources/${resourceId}`,
          decision.payload
        )
        .then(
          (delta: Resource) => {
            savingRef.current = false;
            app.fire('update_resource', delta);
            onResource(delta);
            finishEditing(onSuccess);
          },
          () => {
            // The request client owns the user-facing error toast. Keeping the
            // baseline and draft lets the user retry from the same editor state.
            savingRef.current = false;
          }
        );
    },
    [
      app,
      baselineRef,
      bodyEditorRef,
      contentHash,
      finishEditing,
      getAnchorSync,
      namespaceId,
      onResource,
      resourceId,
      title,
    ]
  );

  useEffect(() => app.on('save', save), [app, save]);

  useEffect(() => {
    const cacheDraft = (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== 's'
      ) {
        return;
      }
      event.preventDefault();

      const baseline = baselineRef.current;
      const editor = bodyEditorRef.current;
      if (!baseline || !editor || editor.isDestroyed) {
        return;
      }
      const currentDocument = editor.getJSON();
      updateResourceEditorDraft({
        resourceId,
        title,
        baselineTitle: baseline.originalName,
        content: serializedEditorContent(editor),
        bodyChanged: isDocumentChanged(
          baseline.comparableDocument,
          currentDocument
        ),
      });
    };

    document.addEventListener('keydown', cacheDraft);
    return () => document.removeEventListener('keydown', cacheDraft);
  }, [baselineRef, bodyEditorRef, resourceId, title]);
}
