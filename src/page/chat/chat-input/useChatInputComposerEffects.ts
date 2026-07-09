import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useEffect,
} from 'react';

import {
  appendMissingResourceMentions,
  type ComposerMention,
  sameMentions,
  type TextSelection,
  updateMentionsForTextChange,
} from './composerDocument';
import {
  type ComposerToolRange,
  syncToolRangesWithTools,
  updateToolRangesForTextChange,
  type VisibleComposerTool,
} from './composerToolTokens';
import { IResTypeContext, ToolType } from './types';

interface UseComposerSyncEffectsParams {
  displayText: string;
  getToolLabel: (tool: VisibleComposerTool) => string;
  lastPublishedQueryRef: MutableRefObject<string>;
  mentions: ComposerMention[];
  publishComposerState: (
    nextText: string,
    nextMentions: ComposerMention[],
    nextToolRanges: ComposerToolRange[],
    selection?: TextSelection
  ) => void;
  selectedResources: IResTypeContext[];
  selectionRef: MutableRefObject<TextSelection>;
  setDisplayText: Dispatch<SetStateAction<string>>;
  setMentions: Dispatch<SetStateAction<ComposerMention[]>>;
  setToolRanges: Dispatch<SetStateAction<ComposerToolRange[]>>;
  toolRanges: ComposerToolRange[];
  tools: ToolType[];
  untitledLabel: string;
  value: string;
}

export function useChatInputComposerEffects(
  params: UseComposerSyncEffectsParams
) {
  const {
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
  } = params;

  useEffect(() => {
    if (value === lastPublishedQueryRef.current) return;
    lastPublishedQueryRef.current = value;
    selectionRef.current = { start: value.length, end: value.length };
    setDisplayText(value);
    setMentions([]);
    setToolRanges([]);
  }, [
    lastPublishedQueryRef,
    selectionRef,
    setDisplayText,
    setMentions,
    setToolRanges,
    value,
  ]);

  useEffect(() => {
    const synced = syncToolRangesWithTools(
      { text: displayText, tools: toolRanges },
      tools,
      getToolLabel
    );
    if (!synced) return;

    const nextMentions = updateMentionsForTextChange(
      displayText,
      synced.text,
      mentions
    );
    publishComposerState(
      synced.text,
      nextMentions,
      synced.tools,
      synced.selection
    );
  }, [
    displayText,
    getToolLabel,
    mentions,
    publishComposerState,
    toolRanges,
    tools,
  ]);

  useEffect(() => {
    if (displayText.length === 0 && selectedResources.length === 0) {
      if (mentions.length > 0) setMentions([]);
      return;
    }

    const document = appendMissingResourceMentions(
      { text: displayText, mentions },
      selectedResources,
      untitledLabel
    );
    if (
      document.text === displayText &&
      sameMentions(document.mentions, mentions)
    ) {
      return;
    }

    const nextToolRanges = updateToolRangesForTextChange(
      displayText,
      document.text,
      toolRanges
    );
    if (!nextToolRanges) return;
    publishComposerState(document.text, document.mentions, nextToolRanges);
  }, [
    displayText,
    mentions,
    publishComposerState,
    selectedResources,
    setMentions,
    toolRanges,
    untitledLabel,
  ]);
}
