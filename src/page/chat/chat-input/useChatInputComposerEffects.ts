import { type MutableRefObject, useEffect } from 'react';

import type { ComposerMention } from './composerDocument';
import {
  sameComposerState,
  syncComposerResources,
  syncComposerTools,
} from './composerExternalSync';
import { createComposerState } from './composerState';
import type {
  ComposerToolRange,
  VisibleComposerTool,
} from './composerToolTokens';
import { IResTypeContext, ToolType } from './types';
import type { PublishComposerState } from './useComposerPublisher';

interface UseComposerSyncEffectsParams {
  displayText: string;
  getToolLabel: (tool: VisibleComposerTool) => string;
  lastPublishedQueryRef: MutableRefObject<string>;
  mentions: ComposerMention[];
  publishComposerState: PublishComposerState;
  selectedResources: IResTypeContext[];
  toolRanges: ComposerToolRange[];
  tools: ToolType[];
  untitledLabel: string;
  value: string;
}

export function useChatInputComposerEffects({
  displayText,
  getToolLabel,
  lastPublishedQueryRef,
  mentions,
  publishComposerState,
  selectedResources,
  toolRanges,
  tools,
  untitledLabel,
  value,
}: UseComposerSyncEffectsParams) {
  useEffect(() => {
    const currentState = { displayText, mentions, toolRanges };
    const valueChanged = value !== lastPublishedQueryRef.current;
    const baseState = valueChanged ? createComposerState(value) : currentState;
    const toolsSynced = syncComposerTools(baseState, tools, getToolLabel);
    const nextState = syncComposerResources(
      toolsSynced,
      selectedResources,
      untitledLabel
    );
    if (!valueChanged && sameComposerState(currentState, nextState)) return;

    const selection =
      nextState.displayText === displayText
        ? undefined
        : {
            start: nextState.displayText.length,
            end: nextState.displayText.length,
          };
    publishComposerState(nextState, selection);
  }, [
    displayText,
    getToolLabel,
    lastPublishedQueryRef,
    mentions,
    publishComposerState,
    selectedResources,
    toolRanges,
    tools,
    untitledLabel,
    value,
  ]);
}
