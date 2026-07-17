import { useMemo } from 'react';

import { displayPartsFromComposerText } from './composerQuery';
import type { ComposerState } from './composerState';
import type { IResTypeContext } from './types';
import { ToolType } from './types';
import type { ChatInputHandle } from './useChatInputComposer';
import type { useComposerCommands } from './useComposerCommands';
import type { useComposerPublisher } from './useComposerPublisher';
import type { useComposerSelection } from './useComposerSelection';

interface UseComposerHandleParams {
  commands: ReturnType<typeof useComposerCommands>;
  composerState: ComposerState;
  onChange: (value: string) => void;
  onSelectedResourcesChange: (value: IResTypeContext[]) => void;
  onToolsChange: (value: ToolType[]) => void;
  publisher: ReturnType<typeof useComposerPublisher>;
  resetComposerState: (text: string) => void;
  selection: ReturnType<typeof useComposerSelection>;
}

/** Exposes the composer commands used by the surrounding toolbar. */
export function useComposerHandle({
  commands,
  composerState,
  onChange,
  onSelectedResourcesChange,
  onToolsChange,
  publisher,
  resetComposerState,
  selection,
}: UseComposerHandleParams) {
  return useMemo<ChatInputHandle>(
    () => ({
      clear: () => {
        selection.selectionRef.current = { start: 0, end: 0 };
        publisher.lastPublishedQueryRef.current = '';
        resetComposerState('');
        onChange('');
        onSelectedResourcesChange([]);
        onToolsChange([]);
      },
      getDisplayParts: () =>
        displayPartsFromComposerText(
          composerState.displayText,
          composerState.mentions,
          composerState.toolRanges
        ),
      insertResource: commands.insertResource,
      rememberSelection: selection.rememberSelection,
      toggleTool: commands.toggleTool,
    }),
    [
      commands,
      composerState,
      onChange,
      onSelectedResourcesChange,
      onToolsChange,
      publisher.lastPublishedQueryRef,
      resetComposerState,
      selection.rememberSelection,
      selection.selectionRef,
    ]
  );
}
