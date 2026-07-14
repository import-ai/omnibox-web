import {
  stripImageUploadNodes,
  type TiptapJsonContent,
} from '@import-ai/omnibox-editor';

export interface EditorUpdatePayload {
  json?: TiptapJsonContent;
  markdown?: string;
  html?: string;
}

export function shouldSaveOmniboxEditorJson(flagValue?: string) {
  return flagValue?.toLowerCase() !== 'false';
}

/**
 * Unfinished imageUpload placeholders are edit-session UI only.
 * Never persist them (legacy Vditor only stored completed markdown images).
 */
export function sanitizeEditorJsonForSave(
  json: TiptapJsonContent
): TiptapJsonContent {
  return (
    stripImageUploadNodes(json) ?? {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    }
  );
}

export function serializeResourceEditorContent(
  payload: EditorUpdatePayload,
  saveJson: boolean
): string {
  if (saveJson && payload.json) {
    return JSON.stringify(sanitizeEditorJsonForSave(payload.json));
  }

  return (
    payload.markdown ??
    (payload.json
      ? JSON.stringify(sanitizeEditorJsonForSave(payload.json))
      : (payload.html ?? ''))
  );
}
