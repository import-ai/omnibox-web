import {
  contentToTiptapJson,
  type TiptapJsonContent,
} from '@import-ai/omnibox-editor';

import {
  type ComparableDocument,
  toComparableDocument,
} from './contentComparison';
import { normalizeResourceEditorContent } from './normalizeResourceEditorContent';

export interface EditBaseline {
  resourceId: string;
  originalName: string;
  originalContent: string;
  comparableDocument: ComparableDocument;
}

interface EditBaselineInput {
  resourceId: string;
  name: string;
  content: string;
  linkBase: string;
  document?: TiptapJsonContent;
}

export function buildEditBaseline({
  resourceId,
  name,
  content,
  linkBase,
  document,
}: EditBaselineInput): EditBaseline {
  const baselineDocument =
    document ??
    normalizeResourceEditorContent(contentToTiptapJson(content, { linkBase }));

  return {
    resourceId,
    originalName: name,
    originalContent: content,
    comparableDocument: toComparableDocument(baselineDocument),
  };
}
