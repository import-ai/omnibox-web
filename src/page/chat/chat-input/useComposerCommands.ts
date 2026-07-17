import { useCallback } from 'react';

import type { ResourceMeta } from '@/interface';

import type { TextSelection } from './composerDocument';
import {
  insertComposerResource,
  isComposerToolSelected,
  toggleComposerTool,
} from './composerOperations';
import type { ComposerState } from './composerState';
import {
  isVisibleComposerTool,
  type VisibleComposerTool,
} from './composerToolTokens';
import { ToolType } from './types';
import type { PublishComposerState } from './useComposerPublisher';

interface UseComposerCommandsParams {
  composerState: ComposerState;
  getToolLabel: (tool: VisibleComposerTool) => string;
  onToolsChange: (value: ToolType[]) => void;
  publishComposerState: PublishComposerState;
  safeInsertionSelection: () => TextSelection;
  tools: ToolType[];
  untitledLabel: string;
}

/** Creates toolbar commands against the current canonical composer state. */
export function useComposerCommands({
  composerState,
  getToolLabel,
  onToolsChange,
  publishComposerState,
  safeInsertionSelection,
  tools,
  untitledLabel,
}: UseComposerCommandsParams) {
  const insertResource = useCallback(
    (resource: ResourceMeta) => {
      const result = insertComposerResource(
        composerState,
        resource,
        safeInsertionSelection(),
        untitledLabel
      );
      publishComposerState(result.state, result.selection);
    },
    [composerState, publishComposerState, safeInsertionSelection, untitledLabel]
  );

  const toggleTool = useCallback(
    (tool: ToolType) => {
      if (!isVisibleComposerTool(tool)) return;
      const existing = isComposerToolSelected(composerState, tool);
      const result = toggleComposerTool(
        composerState,
        tool,
        getToolLabel(tool),
        safeInsertionSelection()
      );
      if (!result) return;

      publishComposerState(result.state, result.selection);
      onToolsChange(
        existing ? tools.filter(item => item !== tool) : [...tools, tool]
      );
    },
    [
      composerState,
      getToolLabel,
      onToolsChange,
      publishComposerState,
      safeInsertionSelection,
      tools,
    ]
  );

  return { insertResource, toggleTool };
}
