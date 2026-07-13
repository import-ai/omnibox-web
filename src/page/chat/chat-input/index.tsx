import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { WorkspaceResourcePicker } from '@/components/resourcePicker';
import type { ResourceMeta } from '@/interface';
import DecisionInput from '@/page/chat/chat-input/DecisionInput';
import {
  ApprovalMode,
  ChatMode,
  InputMode,
  IResTypeContext,
  SendMessageParams,
  ToolType,
} from '@/page/chat/chat-input/types';
import {
  Interrupt,
  MessageDetail,
} from '@/page/chat/core/types/conversation.ts';
import { getLatestContextCompactCapacity } from '@/page/chat/messages/role/assistantMessageUtils';

import ApprovalModeSelect from './ApprovalModeSelect';
import ChatAction from './ChatAction';
import ChatInput, { ChatInputHandle } from './ChatInput';
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
import ChatTool from './ChatTool';
import type { ComposerState } from './composerState';
import ContextCapacityIndicator from './ContextCapacityIndicator';

interface IProps {
  messages: MessageDetail[];
  namespaceId?: string;
  navigatePrefix: string;
  selectedResources: IResTypeContext[];
  setSelectedResources: any;
  renderResourcePicker?: (
    onSelect: (resource: ResourceMeta) => void
  ) => ReactNode;
  initialApprovalMode?: ApprovalMode;
  approvalModeResetKey?: string;
  suppressInitialToolRestore?: boolean;
  loading: boolean;
  waitingForAssistantDelta?: boolean;
  initialQuery?: string;
  sendMessage: ({
    query,
    tools,
    selectedResources,
    mode,
    decisions,
  }: SendMessageParams) => void;
  onStop?: () => void;
}

export default function ChatArea(props: IProps) {
  const {
    messages,
    namespaceId,
    navigatePrefix,
    selectedResources,
    setSelectedResources,
    renderResourcePicker,
    initialApprovalMode,
    approvalModeResetKey,
    suppressInitialToolRestore = false,
    loading,
    waitingForAssistantDelta = false,
    initialQuery,
    sendMessage,
    onStop,
  } = props;

  const draftScope = approvalModeResetKey ?? navigatePrefix;
  const [initialDraft] = useState(() => getChatInputDraft(draftScope));
  const [tools, setTools] = useState<ToolType[]>(initialDraft?.tools ?? []);
  const [mode, setMode] = useState<ChatMode>(ChatMode.ASK);
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
  const composerSelectedResources = useInitialDraftResources
    ? (initialDraft?.selectedResources ?? [])
    : selectedResources;
  const toolRestoreStateRef = useRef(
    createToolRestoreState(suppressInitialToolRestore)
  );
  const restoredTools = useMemo(
    () => getRestoredTools(messages, approvalModeResetKey),
    [messages, approvalModeResetKey]
  );
  const contextCompactCapacity = getLatestContextCompactCapacity(messages);
  const defaultResourcePicker = namespaceId
    ? (onSelect: (resource: ResourceMeta) => void) => (
        <WorkspaceResourcePicker
          namespaceId={namespaceId}
          onSelect={resource => onSelect(resource)}
        />
      )
    : undefined;

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
    if (result.toolsToRestore) {
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

  useEffect(() => {
    setSelectedApprovalMode(initialApprovalMode);
  }, [approvalModeResetKey, initialApprovalMode]);

  const lastMessage = useMemo<MessageDetail | undefined>(() => {
    return messages.at(-1);
  }, [messages]);

  const interrupts = useMemo<Interrupt[]>((): Interrupt[] => {
    return lastMessage?.attrs?.tool_call?.interrupts ?? [];
  }, [lastMessage?.attrs?.tool_call?.interrupts]);

  const inputMode = useMemo(() => {
    return interrupts.length > 0 ? InputMode.DECISION : InputMode.TEXT;
  }, [interrupts]);

  const disabled = useMemo(() => {
    return (
      loading ||
      (inputMode === InputMode.TEXT && (!query || query.trim().length === 0))
    );
  }, [loading, query, inputMode]);

  const handleSend = useCallback(() => {
    const v = query.trim();
    if (v) {
      queryEditedRef.current = true;
      const localTools = [...tools];
      const localContext = structuredClone(selectedResources);
      const displayParts = inputRef.current?.getDisplayParts();
      const localDisplayParts = displayParts?.some(part => part.type !== 'text')
        ? displayParts
        : undefined;
      clearChatInputDraft(draftScope);
      inputRef.current?.clear();
      setQuery('');
      toolRestoreStateRef.current = suppressNextToolRestore(
        toolRestoreStateRef.current,
        false
      );
      setSelectedResources([]);
      sendMessage({
        query: v,
        selectedResources: localContext,
        tools: localTools,
        mode,
        approvalMode,
        displayParts: localDisplayParts,
      });
    }
  }, [
    query,
    draftScope,
    selectedResources,
    setSelectedResources,
    tools,
    mode,
    approvalMode,
    sendMessage,
  ]);

  return interrupts.length > 0 ? (
    <DecisionInput
      interrupts={interrupts}
      approvalMode={approvalMode}
      loading={loading}
      sendMessage={sendMessage}
    />
  ) : (
    <div className="max-w-[766px] w-full mx-auto rounded-2xl p-3 border border-solid border-gray-200 bg-white dark:bg-[#303030] dark:border-[#303030]">
      <ChatInput
        ref={inputRef}
        value={query}
        initialComposerState={initialDraft?.composerState}
        onComposerStateChange={handleComposerStateChange}
        tools={tools}
        selectedResources={composerSelectedResources}
        onChange={handleQueryChange}
        onToolsChange={handleToolsChange}
        onSelectedResourcesChange={setSelectedResources}
        onSend={handleSend}
        disabled={disabled}
      />
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <ChatTool
            tools={tools}
            renderResourcePicker={renderResourcePicker ?? defaultResourcePicker}
            onBeforeOpen={() => inputRef.current?.rememberSelection()}
            onToolToggle={tool => inputRef.current?.toggleTool(tool)}
            onResourceSelect={resource =>
              inputRef.current?.insertResource(resource)
            }
          />
          <ApprovalModeSelect
            approvalMode={approvalMode}
            setApprovalMode={setSelectedApprovalMode}
          />
        </div>
        <div className="flex items-center gap-2">
          {contextCompactCapacity && (
            <ContextCapacityIndicator capacity={contextCompactCapacity} />
          )}
          <ChatAction
            onSend={handleSend}
            onStop={onStop}
            disabled={disabled}
            loading={loading}
            waitingForAssistantDelta={waitingForAssistantDelta}
            mode={mode}
            setMode={setMode}
          />
        </div>
      </div>
    </div>
  );
}
