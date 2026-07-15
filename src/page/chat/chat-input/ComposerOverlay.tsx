import { type ReactNode, type RefObject, useMemo } from 'react';

import { cn } from '@/lib/utils';

import {
  type ComposerMention,
  createResourceMentionText,
  resourceTokenSpacer,
} from './composerDocument';
import { composerTextLayoutClassName } from './composerLayout';
import {
  type ComposerToolRange,
  createToolTokenText,
  toolTokenSpacer,
} from './composerToolTokens';
import { InlineChatToken } from './InlineChatToken';

interface ComposerOverlayProps {
  text: string;
  mentions: ComposerMention[];
  toolRanges: ComposerToolRange[];
  overlayRef: RefObject<HTMLDivElement | null>;
}

type ComposerDecoration =
  | { kind: 'mention'; start: number; end: number; mention: ComposerMention }
  | { kind: 'tool'; start: number; end: number; tool: ComposerToolRange };

function textNode(key: string, text: string): ReactNode {
  return (
    <span key={key} className="text-foreground">
      {text}
    </span>
  );
}

function mentionNode(mention: ComposerMention): ReactNode {
  return (
    <InlineChatToken
      key={`${mention.id}-${mention.start}`}
      icon="resource"
      resource={mention.resource}
      contextType={mention.type}
      spacer={resourceTokenSpacer}
    >
      {mention.label}
    </InlineChatToken>
  );
}

function toolNode(range: ComposerToolRange): ReactNode {
  return (
    <InlineChatToken
      key={`${range.tool}-${range.start}`}
      icon={range.tool}
      spacer={toolTokenSpacer}
    >
      {range.label}
    </InlineChatToken>
  );
}

function validMentions(text: string, mentions: ComposerMention[]) {
  return mentions
    .filter(
      mention =>
        text.slice(mention.start, mention.end) ===
        createResourceMentionText(mention.label)
    )
    .map(mention => ({
      kind: 'mention' as const,
      start: mention.start,
      end: mention.end,
      mention,
    }));
}

function validTools(text: string, toolRanges: ComposerToolRange[]) {
  return toolRanges
    .filter(
      range =>
        text.slice(range.start, range.end) === createToolTokenText(range.label)
    )
    .map(tool => ({
      kind: 'tool' as const,
      start: tool.start,
      end: tool.end,
      tool,
    }));
}

function renderDecoration(decoration: ComposerDecoration): ReactNode {
  return decoration.kind === 'tool'
    ? toolNode(decoration.tool)
    : mentionNode(decoration.mention);
}

function renderOverlayText(
  text: string,
  mentions: ComposerMention[],
  toolRanges: ComposerToolRange[]
) {
  const nodes: ReactNode[] = [];
  const decorations = [
    ...validMentions(text, mentions),
    ...validTools(text, toolRanges),
  ].sort((a, b) => a.start - b.start);
  let cursor = 0;

  decorations.forEach(decoration => {
    if (decoration.start < cursor) return;
    if (cursor < decoration.start) {
      nodes.push(
        textNode(`text-${cursor}`, text.slice(cursor, decoration.start))
      );
    }
    nodes.push(renderDecoration(decoration));
    cursor = decoration.end;
  });

  if (cursor < text.length) {
    nodes.push(textNode(`text-${cursor}`, text.slice(cursor)));
  }

  return text.endsWith('\n') ? [...nodes, '\u00A0'] : nodes;
}

export default function ComposerOverlay(props: ComposerOverlayProps) {
  const { text, mentions, toolRanges, overlayRef } = props;
  const content = useMemo(
    () => renderOverlayText(text, mentions, toolRanges),
    [mentions, text, toolRanges]
  );

  return (
    <div
      ref={overlayRef}
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 z-0 overflow-hidden',
        composerTextLayoutClassName
      )}
    >
      {content}
    </div>
  );
}
