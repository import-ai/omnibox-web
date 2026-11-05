import {
  clearCacheContent,
  clearCacheTitle,
  updateCacheContent,
  updateCacheTitle,
} from './cache';

interface ResourceEditorDraft {
  resourceId: string;
  title: string;
  baselineTitle: string;
  content: string;
  bodyChanged: boolean;
}

export function updateResourceEditorDraft({
  resourceId,
  title,
  baselineTitle,
  content,
  bodyChanged,
}: ResourceEditorDraft) {
  if (title.trim() === baselineTitle) {
    clearCacheTitle(resourceId);
  } else {
    updateCacheTitle(resourceId, title);
  }

  if (bodyChanged) {
    updateCacheContent(resourceId, content);
  } else {
    clearCacheContent(resourceId);
  }
}
