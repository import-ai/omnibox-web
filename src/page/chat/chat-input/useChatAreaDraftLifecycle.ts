import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useChatStore } from '@/page/chat/chatStore';
import { MessageDetail } from '@/page/chat/core/types/conversation.ts';

import type { ChatInputHandle } from './ChatInput';
import {
  clearChatInputDraft,
  createChatInputDraft,
  getChatInputDraft,
  saveChatInputDraft,
} from './chatInputDraft';
import {
  createToolRestoreState,
  getRestoredTools,
  markToolsManuallyChanged,
  resolveToolRestore,
  suppressNextToolRestore,
} from './chatInputToolRestore';
import type { ComposerState } from './composerState';
import type { ApprovalMode, IResTypeContext, ToolType } from './types';

interface UseChatAreaDraftLifecycleParams {
  messages: MessageDetail[];
  navigatePrefix: string;
  selectedResources: IResTypeContext[];
  setSelectedResources: (resources: IResTypeContext[]) => void;
  initialApprovalMode?: ApprovalMode;
  approvalModeResetKey?: string;
  suppressInitialToolRestore?: boolean;
  initialQuery?: string;
}

/** Owns draft restore, tool restore, and input-reset coordination for ChatArea. */
export function useChatAreaDraftLifecycle({
  messages,
  navigatePrefix,
  selectedResources,
  setSelectedResources,
  initialApprovalMode,
  approvalModeResetKey,
  suppressInitialToolRestore = false,
  initialQuery,
}: UseChatAreaDraftLifecycleParams) {
  const draftScope = approvalModeResetKey ?? navigatePrefix;
  const inputResetNonce = useChatStore(state => state.inputResetNonce);
  const syncedInputResetNonceRef = useRef(inputResetNonce);
  const isResettingInput = inputResetNonce !== syncedInputResetNonceRef.current;
  const [initialDraft] = useState(() => getChatInputDraft(draftScope));
  const [tools, setTools] = useState<ToolType[]>(initialDraft?.tools ?? []);
  const [selectedApprovalMode, setSelectedApprovalMode] = useState<
    ApprovalMode | undefined
  >(initialApprovalMode);
  const [query, setQuery] = useState(initialDraft?.query ?? initialQuery ?? '');
  const defaultQueryRef = useRef(initialQuery ?? '');
  const approvalMode: ApprovalMode =
    selectedApprovalMode ??
    (defaultQueryRef.current && query === defaultQueryRef.current
      ? 'auto_approve'
      : 'manual');
  const queryEditedRef = useRef(Boolean(initialDraft));
  const inputRef = useRef<ChatInputHandle>(null);
  const initialDraftPendingRef = useRef(Boolean(initialDraft));
  const initialDraftResourcesRestoredRef = useRef(false);
  const [useInitialDraftResources, setUseInitialDraftResources] = useState(
    Boolean(initialDraft)
  );
  const composerSelectedResources = isResettingInput
    ? []
    : useInitialDraftResources
      ? (initialDraft?.selectedResources ?? [])
      : selectedResources;
  const composerTools = isResettingInput ? [] : tools;
  const composerInitialState = isResettingInput
    ? undefined
    : initialDraft?.composerState;
  const toolRestoreStateRef = useRef(
    createToolRestoreState(suppressInitialToolRestore)
  );
  const restoredTools = useMemo(
    () => getRestoredTools(messages, approvalModeResetKey),
    [messages, approvalModeResetKey]
  );

  useLayoutEffect(() => {
    if (!isResettingInput) return;

    syncedInputResetNonceRef.current = inputResetNonce;
    setTools([]);
    setQuery('');
    queryEditedRef.current = true;
    initialDraftPendingRef.current = false;
    setUseInitialDraftResources(false);
    toolRestoreStateRef.current = markToolsManuallyChanged(
      createToolRestoreState(suppressInitialToolRestore)
    );
    inputRef.current?.clear();
    clearChatInputDraft(draftScope);
  }, [
    draftScope,
    inputResetNonce,
    isResettingInput,
    suppressInitialToolRestore,
  ]);

  useEffect(() => {
    const result = resolveToolRestore(
      restoredTools,
      toolRestoreStateRef.current,
      suppressInitialToolRestore
    );
    toolRestoreStateRef.current = result.nextState;

    if (initialDraftPendingRef.current) {
      initialDraftPendingRef.current = false;
      toolRestoreStateRef.current = markToolsManuallyChanged(result.nextState);
      return;
    }
    if (result.toolsToRestore !== undefined) {
      setTools(result.toolsToRestore);
    }
  }, [restoredTools, suppressInitialToolRestore]);

  useEffect(() => {
    if (suppressInitialToolRestore && !initialDraft) {
      toolRestoreStateRef.current = suppressNextToolRestore(
        toolRestoreStateRef.current,
        false
      );
    }
  }, [approvalModeResetKey, initialDraft, suppressInitialToolRestore]);

  useEffect(() => {
    if (!initialDraft || initialDraftResourcesRestoredRef.current) return;
    initialDraftResourcesRestoredRef.current = true;
    setSelectedResources(initialDraft.selectedResources);
    setUseInitialDraftResources(false);
  }, [initialDraft, setSelectedResources]);

  useEffect(() => {
    if (!initialQuery || queryEditedRef.current) {
      return;
    }

    setQuery(currentQuery => {
      if (currentQuery) {
        return currentQuery;
      }

      defaultQueryRef.current = initialQuery;
      return initialQuery;
    });
  }, [initialQuery]);

  useEffect(() => {
    setSelectedApprovalMode(initialApprovalMode);
  }, [approvalModeResetKey, initialApprovalMode]);

  const handleQueryChange = useCallback((value: string) => {
    queryEditedRef.current = true;
    setQuery(value);
  }, []);

  const handleToolsChange = useCallback((nextTools: ToolType[]) => {
    toolRestoreStateRef.current = markToolsManuallyChanged(
      toolRestoreStateRef.current
    );
    setTools(nextTools);
  }, []);

  const handleComposerStateChange = useCallback(
    (composerState: ComposerState) => {
      if (!composerState.displayText) {
        clearChatInputDraft(draftScope);
        return;
      }
      saveChatInputDraft(draftScope, createChatInputDraft(composerState));
    },
    [draftScope]
  );

  const clearComposerAfterSend = useCallback(() => {
    queryEditedRef.current = true;
    clearChatInputDraft(draftScope);
    inputRef.current?.clear();
    setQuery('');
    toolRestoreStateRef.current = suppressNextToolRestore(
      toolRestoreStateRef.current,
      false
    );
    setSelectedResources([]);
  }, [draftScope, setSelectedResources]);

  return {
    approvalMode,
    clearComposerAfterSend,
    composerInitialState,
    composerSelectedResources,
    composerTools,
    handleComposerStateChange,
    handleQueryChange,
    handleToolsChange,
    inputRef,
    query,
    setSelectedApprovalMode,
    tools,
  };
}
