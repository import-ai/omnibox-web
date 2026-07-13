import { useCallback, useReducer } from 'react';

import {
  type ComposerState,
  composerStateReducer,
  createComposerState,
} from './composerState';
import type { VisibleComposerTool } from './composerToolTokens';
import type { IResTypeContext } from './types';
import { ToolType } from './types';
import { useComposerCommands } from './useComposerCommands';
import { useComposerPublisher } from './useComposerPublisher';
import { useComposerSelection } from './useComposerSelection';

export interface ComposerModelParams {
  getToolLabel: (tool: VisibleComposerTool) => string;
  initialComposerState?: ComposerState;
  onChange: (value: string) => void;
  onComposerStateChange?: (state: ComposerState) => void;
  onSelectedResourcesChange: (value: IResTypeContext[]) => void;
  onToolsChange: (value: ToolType[]) => void;
  selectedResources: IResTypeContext[];
  tools: ToolType[];
  untitledLabel: string;
  value: string;
}

/** Creates the canonical composer model and toolbar commands. */
export function useComposerModel(params: ComposerModelParams) {
  const [composerState, dispatchComposerState] = useReducer(
    composerStateReducer,
    params.initialComposerState ?? createComposerState(params.value)
  );
  const { mentions, toolRanges } = composerState;
  const replaceComposerState = useCallback((state: ComposerState) => {
    dispatchComposerState({ type: 'replace', state });
  }, []);
  const resetComposerState = useCallback((text: string) => {
    dispatchComposerState({ type: 'reset', text });
  }, []);
  const selection = useComposerSelection(
    params.value.length,
    mentions,
    toolRanges
  );
  const publisher = useComposerPublisher({
    commitSelection: selection.commitSelection,
    onChange: params.onChange,
    onComposerStateChange: params.onComposerStateChange,
    onSelectedResourcesChange: params.onSelectedResourcesChange,
    replaceComposerState,
    selectedResources: params.selectedResources,
    value: params.value,
  });
  const commands = useComposerCommands({
    composerState,
    getToolLabel: params.getToolLabel,
    onToolsChange: params.onToolsChange,
    publishComposerState: publisher.publishComposerState,
    safeInsertionSelection: selection.safeInsertionSelection,
    tools: params.tools,
    untitledLabel: params.untitledLabel,
  });

  return {
    commands,
    composerState,
    publisher,
    replaceComposerState,
    resetComposerState,
    selection,
  };
}
