import {
  type ComposerMention,
  createResourceMentionText,
} from './composerDocument';
import {
  type ComposerToolRange,
  createToolTokenText,
} from './composerToolTokens';
import type { ChatMessageDisplayPart, PrivateSearchResource } from './types';

type QueryDecoration = {
  start: number;
  end: number;
  replacement: string;
};

function resourceQueryText(mention: ComposerMention): string {
  const label = mention.label.replace(/[[\]\\]/g, '\\$&');
  return `[${label}](#${mention.resource.id})`;
}

function validResourceDecorations(
  text: string,
  mentions: ComposerMention[]
): QueryDecoration[] {
  return mentions
    .filter(
      mention =>
        text.slice(mention.start, mention.end) ===
        createResourceMentionText(mention.label)
    )
    .map(mention => ({
      start: mention.start,
      end: mention.end,
      replacement: resourceQueryText(mention),
    }));
}

function validToolDecorations(
  text: string,
  toolRanges: ComposerToolRange[]
): QueryDecoration[] {
  return toolRanges
    .filter(
      range =>
        text.slice(range.start, range.end) === createToolTokenText(range.label)
    )
    .map(range => ({
      start: range.start,
      end: range.end,
      replacement: '',
    }));
}

function resourceDisplayPart(mention: ComposerMention): ChatMessageDisplayPart {
  const resource: PrivateSearchResource = {
    id: mention.resource.id,
    name: mention.label,
    type: mention.type,
    resource_type: mention.resource.resource_type,
    attrs: mention.resource.attrs,
  };
  return { type: 'resource', resource };
}

function validDisplayDecorations(
  text: string,
  mentions: ComposerMention[],
  toolRanges: ComposerToolRange[]
) {
  return [
    ...mentions
      .filter(
        mention =>
          text.slice(mention.start, mention.end) ===
          createResourceMentionText(mention.label)
      )
      .map(mention => ({
        start: mention.start,
        end: mention.end,
        part: resourceDisplayPart(mention),
      })),
    ...toolRanges
      .filter(
        range =>
          text.slice(range.start, range.end) ===
          createToolTokenText(range.label)
      )
      .map(range => ({
        start: range.start,
        end: range.end,
        part: {
          type: 'tool',
          tool: range.tool,
        } satisfies ChatMessageDisplayPart,
      })),
  ].sort((a, b) => a.start - b.start);
}

export function queryFromComposerDisplayText(
  text: string,
  mentions: ComposerMention[],
  toolRanges: ComposerToolRange[]
): string {
  const decorations = [
    ...validResourceDecorations(text, mentions),
    ...validToolDecorations(text, toolRanges),
  ].sort((a, b) => a.start - b.start);
  let query = '';
  let cursor = 0;

  decorations.forEach(decoration => {
    if (decoration.start < cursor) return;
    query += text.slice(cursor, decoration.start);
    query += decoration.replacement;
    cursor = decoration.end;
  });

  return query + text.slice(cursor);
}

export function displayPartsFromComposerText(
  text: string,
  mentions: ComposerMention[],
  toolRanges: ComposerToolRange[]
): ChatMessageDisplayPart[] {
  const decorations = validDisplayDecorations(text, mentions, toolRanges);
  const parts: ChatMessageDisplayPart[] = [];
  let cursor = 0;

  decorations.forEach(decoration => {
    if (decoration.start < cursor) return;
    const plainText = text.slice(cursor, decoration.start);
    if (plainText) parts.push({ type: 'text', text: plainText });
    parts.push(decoration.part);
    cursor = decoration.end;
  });

  const tailText = text.slice(cursor);
  if (tailText) parts.push({ type: 'text', text: tailText });
  return parts;
}
