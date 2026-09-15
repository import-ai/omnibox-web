import type { OmniboxEditorCommentSelection } from '@import-ai/omnibox-editor';

import type { ResourceCommentThread } from '@/interface';
import {
  createResourceCommentThread,
  type CreateResourceCommentThreadResponse,
} from '@/service/resourceComments';

import {
  getSelectionContext,
  resolveCommentRange,
  type ResourceCommentEditor,
  restoreResourceCommentAnchors,
} from './commentAnchors';

interface CreateAnchoredCommentThreadOptions {
  namespaceId: string;
  resourceId: string;
  selection: OmniboxEditorCommentSelection;
  contentHash: string;
  content: string;
  attachmentIds?: string[];
}

export async function createAnchoredCommentThread({
  namespaceId,
  resourceId,
  selection,
  contentHash,
  content,
  attachmentIds,
}: CreateAnchoredCommentThreadOptions): Promise<CreateResourceCommentThreadResponse> {
  const trimmed = content.trim();
  const context = getSelectionContext(
    selection.editor,
    selection.from,
    selection.to
  );
  const response = await createResourceCommentThread(namespaceId, resourceId, {
    quoted_text: selection.quotedText,
    anchor_from: selection.from,
    anchor_to: selection.to,
    anchor_prefix: context.prefix,
    anchor_suffix: context.suffix,
    expected_content_hash: contentHash,
    ...(trimmed ? { content: trimmed } : {}),
    ...(attachmentIds?.length ? { attachment_ids: attachmentIds } : {}),
  });
  const range = resolveCommentRange(selection.editor, selection);
  if (range) {
    selection.editor.commands.addResourceComment({
      threadId: response.thread.id,
      from: range.from,
      to: range.to,
      label: getThreadAuthorLabel(response.thread),
      commentCount: Math.max(1, response.thread.comments.length),
      secondaryLabel: getThreadSecondaryLabel(response.thread),
      labels: getThreadCommentLabels(response.thread),
    });
  }
  let anchored = await waitForCommentAnchor(
    selection.editor,
    response.thread.id
  );
  if (!anchored) {
    restoreResourceCommentAnchors(selection.editor, [response.thread]);
    anchored = await waitForCommentAnchor(selection.editor, response.thread.id);
  }

  return response;
}

function waitForCommentAnchor(editor: ResourceCommentEditor, threadId: string) {
  return new Promise<boolean>(resolve => {
    const hasAnchor = () =>
      !!editor.view.dom.querySelector(
        `[data-resource-comment-thread="${threadId}"]`
      );
    if (hasAnchor()) {
      resolve(true);
      return;
    }
    const finish = (found: boolean) => {
      observer.disconnect();
      window.clearTimeout(timeout);
      resolve(found);
    };
    const observer = new MutationObserver(() => {
      if (hasAnchor()) {
        finish(true);
      }
    });
    observer.observe(editor.view.dom, { childList: true, subtree: true });
    requestAnimationFrame(() => {
      if (hasAnchor()) {
        finish(true);
      }
    });
    const timeout = window.setTimeout(() => {
      finish(hasAnchor());
    }, 300);
  });
}

function getThreadAuthorLabel(thread: ResourceCommentThread) {
  const author =
    thread.creator.username || thread.comments[0]?.author.username || '?';
  return Array.from(author.trim())[0]?.toLocaleUpperCase() || '?';
}

function getThreadSecondaryLabel(thread: ResourceCommentThread) {
  const author = thread.comments[1]?.author.username || '';
  return Array.from(author.trim())[0]?.toLocaleUpperCase() || '';
}

function getThreadCommentLabels(thread: ResourceCommentThread) {
  return thread.comments
    .map(
      comment =>
        Array.from(
          comment.author.username?.trim() || '?'
        )[0]?.toLocaleUpperCase() || '?'
    )
    .join('|');
}
