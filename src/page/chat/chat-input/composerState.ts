import type { ComposerMention } from './composerDocument';
import type { ComposerToolRange } from './composerToolTokens';

export interface ComposerState {
  displayText: string;
  mentions: ComposerMention[];
  toolRanges: ComposerToolRange[];
}

export type ComposerStateAction =
  { type: 'replace'; state: ComposerState } | { type: 'reset'; text: string };

export function createComposerState(text = ''): ComposerState {
  return {
    displayText: text,
    mentions: [],
    toolRanges: [],
  };
}

export function composerStateReducer(
  state: ComposerState,
  action: ComposerStateAction
): ComposerState {
  if (action.type === 'reset') return createComposerState(action.text);
  return action.state === state ? state : action.state;
}
