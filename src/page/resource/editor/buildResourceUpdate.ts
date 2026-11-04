import type { TiptapJsonContent } from '@import-ai/omnibox-editor';

import {
  type ComparableDocument,
  isDocumentChanged,
} from './contentComparison';

export interface ResourceUpdatePayload {
  name?: string;
  content?: string;
  expected_content_hash?: string;
  comment_anchors?: unknown[];
  orphaned_comment_thread_ids?: string[];
}

export interface ResourceUpdateInput {
  baselineName: string;
  baselineDocument: ComparableDocument;
  currentName: string;
  currentDocument: TiptapJsonContent;
  getCurrentContent: () => string;
  contentHash?: string;
  anchorSync?: ResourceUpdatePayload | null;
}

export interface ResourceUpdateDecision {
  changed: boolean;
  nameChanged: boolean;
  bodyChanged: boolean;
  payload: ResourceUpdatePayload;
}

export function buildResourceUpdate({
  baselineName,
  baselineDocument,
  currentName,
  currentDocument,
  getCurrentContent,
  contentHash,
  anchorSync,
}: ResourceUpdateInput): ResourceUpdateDecision {
  const name = currentName.trim();
  const nameChanged = name !== baselineName;
  const bodyChanged = isDocumentChanged(baselineDocument, currentDocument);
  const payload: ResourceUpdatePayload = {};

  if (nameChanged) {
    payload.name = name;
  }
  if (bodyChanged) {
    payload.content = getCurrentContent();
    if (contentHash) {
      payload.expected_content_hash = contentHash;
      Object.assign(payload, anchorSync ?? {});
    }
  }

  return {
    changed: nameChanged || bodyChanged,
    nameChanged,
    bodyChanged,
    payload,
  };
}
