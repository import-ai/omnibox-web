import { useCallback, useRef } from 'react';

import {
  mentionsToResources,
  sameResourceContexts,
  type TextSelection,
} from './composerDocument';
import { queryFromComposerDisplayText } from './composerQuery';
import type { ComposerState } from './composerState';
import type { IResTypeContext } from './types';

export type PublishComposerState = (
  state: ComposerState,
  selection?: TextSelection
) => void;

interface UseComposerPublisherParams {
  commitSelection: (selection: TextSelection) => void;
  onChange: (value: string) => void;
  onComposerStateChange?: (state: ComposerState) => void;
  onSelectedResourcesChange: (value: IResTypeContext[]) => void;
  replaceComposerState: (state: ComposerState) => void;
  selectedResources: IResTypeContext[];
  value: string;
}

/** Publishes one canonical composer state and its derived parent values. */
export function useComposerPublisher({
  commitSelection,
  onChange,
  onComposerStateChange,
  onSelectedResourcesChange,
  replaceComposerState,
  selectedResources,
  value,
}: UseComposerPublisherParams) {
  const lastPublishedQueryRef = useRef(value);
  const publishComposerState = useCallback<PublishComposerState>(
    (state, selection) => {
      const nextQuery = queryFromComposerDisplayText(
        state.displayText,
        state.mentions,
        state.toolRanges
      );
      const nextResources = mentionsToResources(state.mentions);

      replaceComposerState(state);
      onComposerStateChange?.(state);
      lastPublishedQueryRef.current = nextQuery;
      onChange(nextQuery);
      if (!sameResourceContexts(selectedResources, nextResources)) {
        onSelectedResourcesChange(nextResources);
      }
      if (selection) commitSelection(selection);
    },
    [
      commitSelection,
      onChange,
      onComposerStateChange,
      onSelectedResourcesChange,
      replaceComposerState,
      selectedResources,
    ]
  );

  return { lastPublishedQueryRef, publishComposerState };
}
