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

interface EditorSchema {
  nodeFromJSON: (json: TiptapJsonContent) => {
    toJSON: () => TiptapJsonContent;
  };
}

interface EditBaselineInput {
  resourceId: string;
  name: string;
  content: string;
  linkBase: string;
  document?: TiptapJsonContent;
  schema?: EditorSchema;
}

export function buildEditBaseline({
  resourceId,
  name,
  content,
  linkBase,
  document,
  schema,
}: EditBaselineInput): EditBaseline {
  let baselineDocument = document;
  if (!baselineDocument) {
    const parsedDocument = normalizeResourceEditorContent(
      contentToTiptapJson(content, { linkBase })
    );
    baselineDocument = schema
      ? schema.nodeFromJSON(parsedDocument).toJSON()
      : parsedDocument;
  }

  return {
    resourceId,
    originalName: name,
    originalContent: content,
    comparableDocument: toComparableDocument(baselineDocument),
  };
}
