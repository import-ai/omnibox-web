import { type ComposerMention, mentionsToResources } from './composerDocument';
import { queryFromComposerDisplayText } from './composerQuery';
import type { ComposerState } from './composerState';
import type { ComposerToolRange } from './composerToolTokens';
import type { IResTypeContext } from './types';
import { ToolType } from './types';

const DRAFT_KEY_PREFIX = 'chat:input-draft:v2:';

export interface ChatInputDraft {
  composerState: ComposerState;
  query: string;
  selectedResources: IResTypeContext[];
  tools: ToolType[];
}

/** Derives the persisted draft directly from one canonical composer state. */
export function createChatInputDraft(
  composerState: ComposerState
): ChatInputDraft {
  return {
    composerState,
    query: queryFromComposerDisplayText(
      composerState.displayText,
      composerState.mentions,
      composerState.toolRanges
    ),
    selectedResources: mentionsToResources(composerState.mentions),
    tools: composerState.toolRanges.map(range => range.tool),
  };
}

/** Saves an unsent composer draft for the current page scope. */
export function saveChatInputDraft(
  scope: string,
  draft: ChatInputDraft,
  storage = getSessionStorage()
) {
  if (!storage) return;
  try {
    storage.setItem(`${DRAFT_KEY_PREFIX}${scope}`, JSON.stringify(draft));
  } catch (error) {
    console.error({ message: 'Failed to save chat input draft', error });
  }
}

/** Reads a validated unsent composer draft for the current page scope. */
export function getChatInputDraft(
  scope: string,
  storage = getSessionStorage()
): ChatInputDraft | undefined {
  if (!storage) return undefined;
  try {
    const value = storage.getItem(`${DRAFT_KEY_PREFIX}${scope}`);
    if (!value) return undefined;
    const parsed: unknown = JSON.parse(value);
    if (isChatInputDraft(parsed)) return parsed;
    console.error({ message: 'Ignored invalid chat input draft', scope });
  } catch (error) {
    console.error({ message: 'Failed to read chat input draft', error });
  }
  return undefined;
}

/** Removes an unsent composer draft after send or explicit reset. */
export function clearChatInputDraft(
  scope: string,
  storage = getSessionStorage()
) {
  if (!storage) return;
  try {
    storage.removeItem(`${DRAFT_KEY_PREFIX}${scope}`);
  } catch (error) {
    console.error({ message: 'Failed to clear chat input draft', error });
  }
}

function getSessionStorage(): Storage | undefined {
  if (typeof sessionStorage === 'undefined') return undefined;
  try {
    return sessionStorage;
  } catch (error) {
    console.error({ message: 'Session storage is unavailable', error });
    return undefined;
  }
}

function isChatInputDraft(value: unknown): value is ChatInputDraft {
  if (!value || typeof value !== 'object') return false;
  return (
    'query' in value &&
    typeof value.query === 'string' &&
    'tools' in value &&
    Array.isArray(value.tools) &&
    value.tools.every(isDraftTool) &&
    'selectedResources' in value &&
    Array.isArray(value.selectedResources) &&
    value.selectedResources.every(isSelectedResource) &&
    'composerState' in value &&
    isComposerState(value.composerState)
  );
}

function isSelectedResource(value: unknown): value is IResTypeContext {
  if (!value || typeof value !== 'object') return false;
  return (
    'type' in value &&
    (value.type === 'resource' || value.type === 'folder') &&
    'resource' in value &&
    Boolean(value.resource) &&
    typeof value.resource === 'object' &&
    'id' in value.resource &&
    typeof value.resource.id === 'string'
  );
}

function isDraftTool(value: unknown): value is ToolType {
  return value === ToolType.WEB_SEARCH || value === ToolType.REASONING;
}

function isComposerState(value: unknown): value is ComposerState {
  if (!value || typeof value !== 'object') return false;
  return (
    'displayText' in value &&
    typeof value.displayText === 'string' &&
    'mentions' in value &&
    Array.isArray(value.mentions) &&
    value.mentions.every(isComposerMention) &&
    'toolRanges' in value &&
    Array.isArray(value.toolRanges) &&
    value.toolRanges.every(isComposerToolRange)
  );
}

function isComposerMention(value: unknown): value is ComposerMention {
  if (!value || typeof value !== 'object') return false;
  return (
    'id' in value &&
    typeof value.id === 'string' &&
    'label' in value &&
    typeof value.label === 'string' &&
    hasValidRange(value) &&
    'resource' in value &&
    Boolean(value.resource) &&
    typeof value.resource === 'object' &&
    'id' in value.resource &&
    typeof value.resource.id === 'string'
  );
}

function isComposerToolRange(value: unknown): value is ComposerToolRange {
  if (!value || typeof value !== 'object') return false;
  return (
    'tool' in value &&
    isDraftTool(value.tool) &&
    'label' in value &&
    typeof value.label === 'string' &&
    hasValidRange(value)
  );
}

function hasValidRange(value: object) {
  return (
    'start' in value &&
    Number.isInteger(value.start) &&
    value.start >= 0 &&
    'end' in value &&
    Number.isInteger(value.end) &&
    value.end >= value.start
  );
}
