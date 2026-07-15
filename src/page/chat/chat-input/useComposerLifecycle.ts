import type { RefObject } from 'react';

import { useComposerTextareaLayout } from './composerTextarea';
import type { VisibleComposerTool } from './composerToolTokens';
import { useChatInputComposerEffects } from './useChatInputComposerEffects';
import type { ComposerModelParams } from './useComposerModel';
import type { useComposerModel } from './useComposerModel';

interface UseComposerLifecycleParams {
  getToolLabel: (tool: VisibleComposerTool) => string;
  model: ReturnType<typeof useComposerModel>;
  overlayRef: RefObject<HTMLDivElement | null>;
  selectedResources: ComposerModelParams['selectedResources'];
  tools: ComposerModelParams['tools'];
  untitledLabel: string;
  value: string;
}

/** Synchronizes external defaults and textarea layout with the composer model. */
export function useComposerLifecycle({
  getToolLabel,
  model,
  overlayRef,
  selectedResources,
  tools,
  untitledLabel,
  value,
}: UseComposerLifecycleParams) {
  const { displayText, mentions, toolRanges } = model.composerState;
  useChatInputComposerEffects({
    displayText,
    getToolLabel,
    lastPublishedQueryRef: model.publisher.lastPublishedQueryRef,
    mentions,
    publishComposerState: model.publisher.publishComposerState,
    selectedResources,
    toolRanges,
    tools,
    untitledLabel,
    value,
  });
  useComposerTextareaLayout({
    displayText,
    overlayRef,
    pendingSelectionRef: model.selection.pendingSelectionRef,
    selectionRef: model.selection.selectionRef,
    textareaRef: model.selection.textareaRef,
    toolRanges,
  });
}
