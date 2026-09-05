import {
  findResourceCommentRange,
  type OmniboxEditorCommentSelection,
} from '@import-ai/omnibox-editor';

import type { ResourceCommentThread } from '@/interface';
import type { ResourceCommentAnchorPayload } from '@/service/resourceComments';

export type ResourceCommentEditor = OmniboxEditorCommentSelection['editor'];

const CONTEXT_LENGTH = 250;

export interface ResourceCommentAnchorSync {
  comment_anchors: ResourceCommentAnchorPayload[];
  orphaned_comment_thread_ids: string[];
}

interface TextSegment {
  text_start: number;
  text_end: number;
  document_from: number;
  document_to: number;
}

export function getSelectionContext(
  editor: ResourceCommentEditor,
  from: number,
  to: number
) {
  const maxPosition = editor.state.doc.content.size;
  return {
    prefix: editor.state.doc
      .textBetween(Math.max(0, from - CONTEXT_LENGTH), from, '\n')
      .slice(-CONTEXT_LENGTH),
    suffix: editor.state.doc
      .textBetween(to, Math.min(maxPosition, to + CONTEXT_LENGTH), '\n')
      .slice(0, CONTEXT_LENGTH),
  };
}

export function restoreResourceCommentAnchors(
  editor: ResourceCommentEditor,
  threads: ResourceCommentThread[]
) {
  for (const thread of threads) {
    if (thread.anchor.status !== 'active') {
      continue;
    }

    const storedRange = {
      from: thread.anchor.from,
      to: thread.anchor.to,
    };
    const existingRange = findResourceCommentRange(editor, thread.id);
    const range =
      existingRange ??
      (rangeMatchesQuote(editor, storedRange, thread.quoted_text)
        ? storedRange
        : findQuoteRange(
            editor,
            thread.quoted_text,
            thread.anchor.prefix,
            thread.anchor.suffix
          ));

    if (range) {
      if (existingRange) {
        editor.commands.removeResourceComment(thread.id);
      }
      editor.commands.addResourceComment({
        threadId: thread.id,
        label: getCommentAuthorLabel(thread),
        commentCount: Math.max(1, thread.comments.length),
        secondaryLabel: getCommentSecondaryLabel(thread),
        labels: getCommentLabels(thread),
        ...range,
      });
    }
  }
}

function getCommentAuthorLabel(thread: ResourceCommentThread) {
  const author =
    thread.creator.username || thread.comments[0]?.author.username || '?';
  return Array.from(author.trim())[0]?.toLocaleUpperCase() || '?';
}

function getCommentSecondaryLabel(thread: ResourceCommentThread) {
  const author = thread.comments[1]?.author.username || '';
  return Array.from(author.trim())[0]?.toLocaleUpperCase() || '';
}

function getCommentLabels(thread: ResourceCommentThread) {
  return thread.comments
    .map(
      comment =>
        Array.from(
          comment.author.username?.trim() || '?'
        )[0]?.toLocaleUpperCase() || '?'
    )
    .join('|');
}

export function collectResourceCommentAnchors(
  editor: ResourceCommentEditor,
  threads: ResourceCommentThread[]
): ResourceCommentAnchorSync {
  const commentAnchors: ResourceCommentAnchorPayload[] = [];
  const orphanedThreadIds: string[] = [];

  for (const thread of threads) {
    if (thread.anchor.status !== 'active') {
      continue;
    }
    const range = findResourceCommentRange(editor, thread.id);
    if (!range) {
      orphanedThreadIds.push(thread.id);
      continue;
    }
    const quotedText = editor.state.doc
      .textBetween(range.from, range.to, '\n')
      .trim();
    if (!quotedText) {
      orphanedThreadIds.push(thread.id);
      continue;
    }
    const context = getSelectionContext(editor, range.from, range.to);
    commentAnchors.push({
      thread_id: thread.id,
      from: range.from,
      to: range.to,
      quoted_text: quotedText,
      prefix: context.prefix,
      suffix: context.suffix,
    });
  }

  return {
    comment_anchors: commentAnchors,
    orphaned_comment_thread_ids: orphanedThreadIds,
  };
}

function rangeMatchesQuote(
  editor: ResourceCommentEditor,
  range: { from: number; to: number },
  quotedText: string
) {
  const maxPosition = editor.state.doc.content.size;
  if (range.from < 0 || range.from >= range.to || range.to > maxPosition) {
    return false;
  }
  return (
    editor.state.doc.textBetween(range.from, range.to, '\n').trim() ===
    quotedText.trim()
  );
}

function findQuoteRange(
  editor: ResourceCommentEditor,
  quotedText: string,
  prefix: string,
  suffix: string
) {
  const quote = quotedText.trim();
  if (!quote) {
    return null;
  }
  const { text, segments } = flattenDocumentText(editor);
  const candidates: number[] = [];
  let searchFrom = 0;
  while (searchFrom <= text.length - quote.length) {
    const start = text.indexOf(quote, searchFrom);
    if (start < 0) break;
    candidates.push(start);
    searchFrom = start + 1;
  }
  if (candidates.length === 0) {
    return null;
  }

  const contextualCandidates = candidates.filter(start => {
    const before = text.slice(Math.max(0, start - prefix.length), start);
    const after = text.slice(
      start + quote.length,
      start + quote.length + suffix.length
    );
    return (!prefix || before === prefix) && (!suffix || after === suffix);
  });
  const matched =
    contextualCandidates.length === 1 ? contextualCandidates : candidates;
  if (matched.length !== 1) {
    return null;
  }
  return mapTextRangeToDocument(
    segments,
    matched[0],
    matched[0] + quote.length
  );
}

function flattenDocumentText(editor: ResourceCommentEditor) {
  let text = '';
  let previousDocumentTo: number | null = null;
  const segments: TextSegment[] = [];

  editor.state.doc.descendants((node, position) => {
    if (!node.isText || !node.text) {
      return true;
    }
    if (previousDocumentTo !== null && position > previousDocumentTo) {
      text += '\n';
    }
    const textStart = text.length;
    text += node.text;
    segments.push({
      text_start: textStart,
      text_end: text.length,
      document_from: position,
      document_to: position + node.nodeSize,
    });
    previousDocumentTo = position + node.nodeSize;
    return true;
  });

  return { text, segments };
}

function mapTextRangeToDocument(
  segments: TextSegment[],
  textFrom: number,
  textTo: number
) {
  const startSegment = segments.find(
    segment => textFrom >= segment.text_start && textFrom < segment.text_end
  );
  const endSegment = segments.find(
    segment => textTo > segment.text_start && textTo <= segment.text_end
  );
  if (!startSegment || !endSegment) {
    return null;
  }
  return {
    from: startSegment.document_from + (textFrom - startSegment.text_start),
    to: endSegment.document_from + (textTo - endSegment.text_start),
  };
}
