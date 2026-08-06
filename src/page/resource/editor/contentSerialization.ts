import type { TiptapJsonContent } from '@import-ai/omnibox-editor';

export interface EditorUpdatePayload {
  json?: TiptapJsonContent;
  markdown?: string;
  html?: string;
}

/** Persist editor content as markdown only. */
export function serializeResourceEditorContent(
  payload: EditorUpdatePayload
): string {
  return payload.markdown ?? '';
}
