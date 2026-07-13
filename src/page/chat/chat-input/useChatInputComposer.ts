import { useCallback, useRef, useState } from 'react';

import type { ResourceMeta } from '@/interface';

import { syncOverlayScroll } from './composerTextarea';
import type { ChatMessageDisplayPart } from './types';
import { ToolType } from './types';
import { useComposerHandle } from './useComposerHandle';
import { useComposerInputHandlers } from './useComposerInputHandlers';
import { useComposerLifecycle } from './useComposerLifecycle';
import { type ComposerModelParams, useComposerModel } from './useComposerModel';
import { useComposerTextChange } from './useComposerTextChange';

export interface ChatInputHandle {
  clear: () => void;
  getDisplayParts: () => ChatMessageDisplayPart[];
  insertResource: (resource: ResourceMeta) => void;
  rememberSelection: () => void;
  toggleTool: (tool: ToolType) => void;
}

interface UseChatInputComposerParams extends ComposerModelParams {
  disabled: boolean;
  onSend: () => void;
}

/** Composes the chat textarea model, handlers, lifecycle, and toolbar API. */
export function useChatInputComposer(params: UseChatInputComposerParams) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const model = useComposerModel(params);
  const handleKeyDown = useComposerInputHandlers({
    composerState: model.composerState,
    disabled: params.disabled,
    isComposing,
    onSend: params.onSend,
    onToolsChange: params.onToolsChange,
    publishComposerState: model.publisher.publishComposerState,
    selectionRef: model.selection.selectionRef,
    tools: params.tools,
  });
  const handleTextChange = useComposerTextChange(
    model.composerState,
    model.publisher.publishComposerState,
    model.selection.selectionRef
  );
  const handleScroll = useCallback(() => {
    syncOverlayScroll(model.selection.textareaRef.current, overlayRef.current);
  }, [model.selection.textareaRef]);
  const handle = useComposerHandle({
    ...model,
    onChange: params.onChange,
    onSelectedResourcesChange: params.onSelectedResourcesChange,
    onToolsChange: params.onToolsChange,
  });
  useComposerLifecycle({
    getToolLabel: params.getToolLabel,
    model,
    overlayRef,
    selectedResources: params.selectedResources,
    tools: params.tools,
    untitledLabel: params.untitledLabel,
    value: params.value,
  });
  const { displayText, mentions, toolRanges } = model.composerState;

  return {
    displayText,
    handle,
    handleKeyDown,
    handleScroll,
    handleTextChange,
    mentions,
    overlayRef,
    rememberSelection: model.selection.rememberSelection,
    setIsComposing,
    textareaRef: model.selection.textareaRef,
    toolRanges,
  };
}
