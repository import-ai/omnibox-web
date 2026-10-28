import {
  findResourceCommentRange,
  type OmniboxEditorCommentSelection,
} from '@import-ai/omnibox-editor';

import type { ResourceCommentThread } from '@/interface';
import type { ResourceCommentAnchorPayload } from '@/service/resourceComments';

import {
  commentQuoteForStorage,
  isImageCommentQuote,
  parseImageCommentQuote,
} from './commentQuote';
import { addImageCommentMark, getImageCommentRange } from './imageCommentMarks';

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
    // Image comments can be marked orphaned after their in-memory anchor is
    // cleared. Put them back when the image is still in the document.
    if (
      thread.anchor.status !== 'active' &&
      !isImageCommentQuote(thread.quoted_text)
    ) {
      continue;
    }

    const storedRange = {
      from: thread.anchor.from,
      to: thread.anchor.to,
    };
    if (findResourceCommentRange(editor, thread.id)) {
      editor.commands.setResourceCommentResolved?.(thread.id, thread.resolved);
      continue;
    }
    const range =
      thread.anchor.status === 'active'
        ? resolveCommentRange(editor, {
            from: storedRange.from,
            to: storedRange.to,
            quotedText: thread.quoted_text,
            prefix: thread.anchor.prefix,
            suffix: thread.anchor.suffix,
          })
        : findImageCommentRange(editor, {
            quotedText: thread.quoted_text,
            prefix: thread.anchor.prefix,
            suffix: thread.anchor.suffix,
          });

    if (range) {
      if (imageAtRange(editor, range.from, range.to)) {
        // omnibox-editor 0.0.60 only marks text. Paint the image node directly.
        addImageCommentMark(editor, {
          threadId: thread.id,
          from: range.from,
          to: range.to,
          resolved: thread.resolved,
        });
      }
      editor.commands.addResourceComment({
        threadId: thread.id,
        label: getCommentAuthorLabel(thread),
        commentCount: Math.max(1, thread.comments.length),
        secondaryLabel: getCommentSecondaryLabel(thread),
        labels: getCommentLabels(thread),
        resolved: thread.resolved,
        ...range,
      });
    }
  }
  if (!editor.isDestroyed && editor.view?.dom) {
    editor.view.dom.setAttribute('data-comment-anchors-ready', 'true');
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
    let range =
      getImageCommentRange(editor, thread.id) ??
      findResourceCommentRange(editor, thread.id);
    if (!range && isImageCommentQuote(thread.quoted_text)) {
      // The published editor cannot mark an image node, so a missing text
      // range is not proof that the image comment is gone.
      range = resolveCommentRange(editor, {
        from: thread.anchor.from,
        to: thread.anchor.to,
        quotedText: thread.quoted_text,
        prefix: thread.anchor.prefix,
        suffix: thread.anchor.suffix,
      });
      if (range && imageAtRange(editor, range.from, range.to)) {
        addImageCommentMark(editor, {
          threadId: thread.id,
          from: range.from,
          to: range.to,
          resolved: thread.resolved,
        });
      }
      if (range) {
        editor.commands.addResourceComment({
          threadId: thread.id,
          from: range.from,
          to: range.to,
          label: getCommentAuthorLabel(thread),
          commentCount: Math.max(1, thread.comments.length),
          secondaryLabel: getCommentSecondaryLabel(thread),
          labels: getCommentLabels(thread),
          resolved: thread.resolved,
        });
      }
    }
    if (!range) {
      orphanedThreadIds.push(thread.id);
      continue;
    }
    const image = imageAtRange(editor, range.from, range.to);
    const quotedText = image
      ? commentQuoteForStorage(thread.quoted_text, true)
      : editor.state.doc.textBetween(range.from, range.to, '\n').trim();
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

export function resolveCommentRange(
  editor: ResourceCommentEditor,
  selection: {
    from: number;
    to: number;
    quotedText: string;
    prefix?: string;
    suffix?: string;
  }
) {
  if (imageAtRange(editor, selection.from, selection.to)) {
    return { from: selection.from, to: selection.to };
  }
  if (isImageCommentQuote(selection.quotedText)) {
    return findImageCommentRange(editor, selection);
  }
  if (rangeMatchesQuote(editor, selection, selection.quotedText)) {
    return { from: selection.from, to: selection.to };
  }
  const exactRange = findQuoteRange(
    editor,
    selection.quotedText,
    selection.prefix ?? '',
    selection.suffix ?? ''
  );
  if (exactRange) {
    return exactRange;
  }
  return findNearbyQuoteRange(editor, selection);
}

function imageAtRange(editor: ResourceCommentEditor, from: number, to: number) {
  const node = editor.state.doc.nodeAt?.(from);
  if (!node || node.type?.name !== 'image' || to !== from + node.nodeSize) {
    return null;
  }
  return node;
}

function findImageCommentRange(
  editor: ResourceCommentEditor,
  selection: {
    quotedText: string;
    prefix?: string;
    suffix?: string;
  }
) {
  const parsed = parseImageCommentQuote(selection.quotedText);
  if (!isImageCommentQuote(selection.quotedText)) {
    return null;
  }
  const prefix = selection.prefix ?? '';
  const suffix = selection.suffix ?? '';
  const matches: Array<{ from: number; to: number; src: string }> = [];
  editor.state.doc.descendants((node, position) => {
    if (node.type?.name !== 'image') {
      return true;
    }
    const from = position;
    const to = position + node.nodeSize;
    const context = getSelectionContext(editor, from, to);
    if (context.prefix === prefix && context.suffix === suffix) {
      matches.push({
        from,
        to,
        src: String(node.attrs?.src ?? ''),
      });
    }
    return true;
  });
  const scoped = parsed?.src
    ? matches.filter(match => match.src === parsed.src)
    : matches;
  if (scoped.length !== 1) {
    return null;
  }
  return { from: scoped[0].from, to: scoped[0].to };
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

function findNearbyQuoteRange(
  editor: ResourceCommentEditor,
  selection: {
    from: number;
    to: number;
    quotedText: string;
  }
) {
  const quote = selection.quotedText.trim();
  if (!quote) {
    return null;
  }
  const { text, segments } = flattenDocumentText(editor);
  const expectedStart = documentPositionToTextOffset(segments, selection.from);
  let searchFrom = 0;
  let nearest: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  while (searchFrom <= text.length - quote.length) {
    const start = text.indexOf(quote, searchFrom);
    if (start < 0) {
      break;
    }
    const distance = Math.abs(start - expectedStart);
    if (distance < nearestDistance) {
      nearest = start;
      nearestDistance = distance;
    }
    searchFrom = start + 1;
  }
  if (nearest != null) {
    return mapTextRangeToDocument(segments, nearest, nearest + quote.length);
  }
  return null;
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
    contextualCandidates.length === 1
      ? contextualCandidates[0]
      : candidates.length === 1
        ? candidates[0]
        : null;
  if (matched == null) {
    return null;
  }
  return mapTextRangeToDocument(segments, matched, matched + quote.length);
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

function documentPositionToTextOffset(
  segments: TextSegment[],
  documentPosition: number
) {
  const segment = segments.find(
    item =>
      documentPosition >= item.document_from &&
      documentPosition <= item.document_to
  );
  if (!segment) {
    return segments[0]?.text_start ?? 0;
  }
  return segment.text_start + (documentPosition - segment.document_from);
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
