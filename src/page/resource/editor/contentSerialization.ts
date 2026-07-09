import type { TiptapJsonContent } from '@import-ai/omnibox-editor';

export interface EditorUpdatePayload {
  json?: TiptapJsonContent;
  markdown?: string;
  html?: string;
}

export function shouldSaveOmniboxEditorJson(flagValue?: string) {
  return flagValue?.toLowerCase() !== 'false';
}

export function serializeResourceEditorContent(
  payload: EditorUpdatePayload,
  saveJson: boolean
): string {
  if (saveJson && payload.json) {
    return JSON.stringify(payload.json);
  }

  return (
    payload.markdown ??
    (payload.json ? JSON.stringify(payload.json) : (payload.html ?? ''))
  );
}
