import { useCallback, useMemo, useRef, useState } from 'react';

import type { ResourceMeta } from '@/interface';

import {
  type ComposerMention,
  insertResourceMention,
  mentionsToResources,
  sameResourceContexts,
  type TextSelection,
  updateMentionsForTextChange,
} from './composerDocument';
import {
  displayPartsFromComposerText,
  queryFromComposerDisplayText,
} from './composerQuery';
import {
  getTextareaSelection,
  handleAtomicToolKeyDown,
  restoreRejectedToolEdit,
  setTextareaSelection,
  syncOverlayScroll,
  useComposerTextareaLayout,
} from './composerTextarea';
import {
  type ComposerToolRange,
  insertToolRange,
  isVisibleComposerTool,
  removeToolRange,
  selectionIntersectsToolRange,
  shiftToolRangesForReplacement,
  snapSelectionToToolBoundary,
  updateToolRangesForTextChange,
  type VisibleComposerTool,
} from './composerToolTokens';
import type { ChatMessageDisplayPart, IResTypeContext } from './types';
import { ToolType } from './types';
import { useChatInputComposerEffects } from './useChatInputComposerEffects';
import { useComposerDeletionHandlers } from './useComposerDeletionHandlers';

export interface ChatInputHandle {
  clear: () => void;
  getDisplayParts: () => ChatMessageDisplayPart[];
  insertResource: (resource: ResourceMeta) => void;
  rememberSelection: () => void;
  toggleTool: (tool: ToolType) => void;
}

interface UseChatInputComposerParams {
  value: string;
  disabled: boolean;
  tools: ToolType[];
  selectedResources: IResTypeContext[];
  untitledLabel: string;
  getToolLabel: (tool: VisibleComposerTool) => string;
  onChange: (value: string) => void;
  onToolsChange: (value: ToolType[]) => void;
  onSelectedResourcesChange: (value: IResTypeContext[]) => void;
  onSend: () => void;
}

export function useChatInputComposer(params: UseChatInputComposerParams) {
  const {
    value,
    disabled,
    tools,
    selectedResources,
    untitledLabel,
    getToolLabel,
    onChange,
    onToolsChange,
    onSelectedResourcesChange,
    onSend,
  } = params;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<TextSelection>({
    start: value.length,
    end: value.length,
  });
  const pendingSelectionRef = useRef<TextSelection | null>(null);
  const lastPublishedQueryRef = useRef(value);
  const [displayText, setDisplayText] = useState(value);
  const [mentions, setMentions] = useState<ComposerMention[]>([]);
  const [toolRanges, setToolRanges] = useState<ComposerToolRange[]>([]);
  const [isComposing, setIsComposing] = useState(false);

  const publishComposerState = useCallback(
    (
      nextText: string,
      nextMentions: ComposerMention[],
      nextToolRanges: ComposerToolRange[],
      selection?: TextSelection
    ) => {
      const nextQuery = queryFromComposerDisplayText(
        nextText,
        nextMentions,
        nextToolRanges
      );
      const nextResources = mentionsToResources(nextMentions);

      setDisplayText(nextText);
      setMentions(nextMentions);
      setToolRanges(nextToolRanges);
      lastPublishedQueryRef.current = nextQuery;
      onChange(nextQuery);
      if (!sameResourceContexts(selectedResources, nextResources)) {
        onSelectedResourcesChange(nextResources);
      }
      if (selection) pendingSelectionRef.current = selection;
    },
    [onChange, onSelectedResourcesChange, selectedResources]
  );

  const rememberSelection = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const selection = snapSelectionToToolBoundary(
      getTextareaSelection(textarea),
      toolRanges
    );
    selectionRef.current = selection;
    if (
      selection.start !== textarea.selectionStart ||
      selection.end !== textarea.selectionEnd
    ) {
      setTextareaSelection(textarea, selection);
    }
  }, [toolRanges]);

  const restoreToolEdit = useCallback(
    (textarea: HTMLTextAreaElement) => {
      restoreRejectedToolEdit(textarea, displayText, toolRanges, selectionRef);
    },
    [displayText, toolRanges]
  );

  const safeInsertionSelection = useCallback(() => {
    const selection = selectionRef.current;
    if (!selectionIntersectsToolRange(selection, toolRanges)) {
      return snapSelectionToToolBoundary(selection, toolRanges);
    }
    return snapSelectionToToolBoundary(
      { start: selection.end, end: selection.end },
      toolRanges
    );
  }, [toolRanges]);

  const insertResource = useCallback(
    (resource: ResourceMeta) => {
      const selection = safeInsertionSelection();
      const document = insertResourceMention(
        { text: displayText, mentions },
        resource,
        selection,
        untitledLabel
      );
      const insertedLength =
        document.selection.start - document.replacedRange.start;
      const nextToolRanges = shiftToolRangesForReplacement(
        toolRanges,
        document.replacedRange,
        insertedLength
      );
      publishComposerState(
        document.text,
        document.mentions,
        nextToolRanges,
        document.selection
      );
    },
    [
      displayText,
      mentions,
      publishComposerState,
      safeInsertionSelection,
      toolRanges,
      untitledLabel,
    ]
  );

  const toggleTool = useCallback(
    (tool: ToolType) => {
      if (!isVisibleComposerTool(tool)) return;
      const currentDocument = { text: displayText, tools: toolRanges };
      const existing = toolRanges.some(range => range.tool === tool);
      const result = existing
        ? removeToolRange(currentDocument, tool)
        : insertToolRange(
            currentDocument,
            tool,
            getToolLabel(tool),
            safeInsertionSelection()
          );
      const nextMentions = updateMentionsForTextChange(
        displayText,
        result.text,
        mentions
      );

      publishComposerState(
        result.text,
        nextMentions,
        result.tools,
        result.selection
      );
      onToolsChange(
        existing ? tools.filter(item => item !== tool) : [...tools, tool]
      );
    },
    [
      displayText,
      getToolLabel,
      mentions,
      onToolsChange,
      publishComposerState,
      safeInsertionSelection,
      toolRanges,
      tools,
    ]
  );

  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const nextText = event.target.value;
      const nextToolRanges = updateToolRangesForTextChange(
        displayText,
        nextText,
        toolRanges
      );

      if (!nextToolRanges) {
        restoreToolEdit(event.target);
        return;
      }

      const nextMentions = updateMentionsForTextChange(
        displayText,
        nextText,
        mentions
      );
      const selection = snapSelectionToToolBoundary(
        getTextareaSelection(event.target),
        nextToolRanges
      );

      selectionRef.current = selection;
      publishComposerState(nextText, nextMentions, nextToolRanges, selection);
    },
    [displayText, mentions, publishComposerState, restoreToolEdit, toolRanges]
  );

  const handleDeletionKeyDown = useComposerDeletionHandlers({
    displayText,
    mentions,
    onToolsChange,
    publishComposerState,
    toolRanges,
    tools,
  });

  const handleAtomicKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) =>
      handleAtomicToolKeyDown(event, toolRanges, selectionRef),
    [toolRanges]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (handleDeletionKeyDown(event)) return;
      if (handleAtomicKeyDown(event)) return;
      if (isComposing || event.key !== 'Enter' || event.shiftKey) return;

      event.preventDefault();
      if (event.metaKey || event.ctrlKey || event.altKey || disabled) return;
      onSend();
    },
    [disabled, handleAtomicKeyDown, handleDeletionKeyDown, isComposing, onSend]
  );

  const handleScroll = useCallback(() => {
    syncOverlayScroll(textareaRef.current, overlayRef.current);
  }, []);

  const handle = useMemo<ChatInputHandle>(
    () => ({
      clear: () => {
        selectionRef.current = { start: 0, end: 0 };
        lastPublishedQueryRef.current = '';
        setDisplayText('');
        setMentions([]);
        setToolRanges([]);
        onChange('');
        onSelectedResourcesChange([]);
        onToolsChange([]);
      },
      getDisplayParts: () =>
        displayPartsFromComposerText(displayText, mentions, toolRanges),
      insertResource,
      rememberSelection,
      toggleTool,
    }),
    [
      displayText,
      insertResource,
      mentions,
      onChange,
      onSelectedResourcesChange,
      onToolsChange,
      rememberSelection,
      toolRanges,
      toggleTool,
    ]
  );

  useChatInputComposerEffects({
    displayText,
    getToolLabel,
    lastPublishedQueryRef,
    mentions,
    publishComposerState,
    selectedResources,
    selectionRef,
    setDisplayText,
    setMentions,
    setToolRanges,
    toolRanges,
    tools,
    untitledLabel,
    value,
  });

  useComposerTextareaLayout({
    displayText,
    overlayRef,
    pendingSelectionRef,
    selectionRef,
    textareaRef,
    toolRanges,
  });

  return {
    displayText,
    handle,
    handleKeyDown,
    handleScroll,
    handleTextChange,
    mentions,
    overlayRef,
    rememberSelection,
    setIsComposing,
    textareaRef,
    toolRanges,
  };
}
