import {
  appendMissingResourceMentions,
  deleteResourceMention,
  mentionKey,
  sameMentions,
} from './composerDocument';
import { toggleComposerTool } from './composerOperations';
import type { ComposerState } from './composerState';
import {
  isVisibleComposerTool,
  sameToolRanges,
  shiftToolRangesForReplacement,
  updateToolRangesForTextChange,
  type VisibleComposerTool,
} from './composerToolTokens';
import type { IResTypeContext } from './types';
import { ToolType } from './types';

/** Reconciles toolbar state one atomic token at a time. */
export function syncComposerTools(
  state: ComposerState,
  tools: ToolType[],
  getLabel: (tool: VisibleComposerTool) => string
): ComposerState {
  let next = state;
  const visibleTools = tools.filter(isVisibleComposerTool);

  next.toolRanges
    .filter(range => !visibleTools.includes(range.tool))
    .forEach(range => {
      next =
        toggleComposerTool(next, range.tool, range.label, {
          start: range.start,
          end: range.start,
        })?.state ?? next;
    });

  visibleTools.forEach(tool => {
    const label = getLabel(tool);
    const existing = next.toolRanges.find(range => range.tool === tool);
    if (existing?.label === label) return;

    let selection = {
      start: next.displayText.length,
      end: next.displayText.length,
    };
    if (existing) {
      selection = { start: existing.start, end: existing.start };
      next =
        toggleComposerTool(next, tool, existing.label, selection)?.state ??
        next;
    }
    next = toggleComposerTool(next, tool, label, selection)?.state ?? next;
  });

  return next;
}

/** Reconciles selected resources while preserving every remaining token range. */
export function syncComposerResources(
  state: ComposerState,
  resources: IResTypeContext[],
  fallbackLabel: string
): ComposerState {
  let next = state;
  const selectedResourceIds = new Set(resources.map(item => item.resource.id));
  const staleMentionKeys = next.mentions
    .filter(mention => !selectedResourceIds.has(mention.resource.id))
    .map(mentionKey);

  staleMentionKeys.forEach(key => {
    const mention = next.mentions.find(item => mentionKey(item) === key);
    if (!mention) return;
    const removed = deleteResourceMention(
      { text: next.displayText, mentions: next.mentions },
      { start: mention.start, end: mention.end },
      'Delete'
    );
    if (!removed) return;

    next = {
      displayText: removed.text,
      mentions: removed.mentions,
      toolRanges: shiftToolRangesForReplacement(next.toolRanges, mention, 0),
    };
  });

  resources.forEach(resource => {
    const document = appendMissingResourceMentions(
      { text: next.displayText, mentions: next.mentions },
      [resource],
      fallbackLabel
    );
    if (
      document.text === next.displayText &&
      sameMentions(document.mentions, next.mentions)
    ) {
      return;
    }
    const toolRanges = updateToolRangesForTextChange(
      next.displayText,
      document.text,
      next.toolRanges
    );
    if (!toolRanges) return;
    next = {
      displayText: document.text,
      mentions: document.mentions,
      toolRanges,
    };
  });

  return next;
}

export function sameComposerState(
  first: ComposerState,
  second: ComposerState
): boolean {
  return (
    first.displayText === second.displayText &&
    sameMentions(first.mentions, second.mentions) &&
    sameToolRanges(first.toolRanges, second.toolRanges)
  );
}
