import { type ReactNode, useCallback, useState } from 'react';

import { WorkspaceResourcePicker } from '@/components/resourcePicker';
import type { ResourceMeta } from '@/interface';
import DecisionInput from '@/page/chat/chat-input/DecisionInput';
import {
  ApprovalMode,
  ChatMode,
  IResTypeContext,
  SendMessageParams,
} from '@/page/chat/chat-input/types';
import { MessageDetail } from '@/page/chat/core/types/conversation.ts';
import { getLatestContextCompactCapacity } from '@/page/chat/messages/role/assistantMessageUtils';

import ApprovalModeSelect from './ApprovalModeSelect';
import ChatAction from './ChatAction';
import ChatInput from './ChatInput';
import ChatTool from './ChatTool';
import ContextCapacityIndicator from './ContextCapacityIndicator';
import { useChatAreaDraftLifecycle } from './useChatAreaDraftLifecycle';

interface IProps {
  messages: MessageDetail[];
  namespaceId?: string;
  navigatePrefix: string;
  selectedResources: IResTypeContext[];
  setSelectedResources: (resources: IResTypeContext[]) => void;
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

  const [mode, setMode] = useState<ChatMode>(ChatMode.ASK);
  const {
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
  } = useChatAreaDraftLifecycle({
    messages,
    navigatePrefix,
    selectedResources,
    setSelectedResources,
    initialApprovalMode,
    approvalModeResetKey,
    suppressInitialToolRestore,
    initialQuery,
  });
  const contextCompactCapacity = getLatestContextCompactCapacity(messages);
  const defaultResourcePicker = namespaceId
    ? (onSelect: (resource: ResourceMeta) => void) => (
        <WorkspaceResourcePicker
          namespaceId={namespaceId}
          onSelect={onSelect}
        />
      )
    : undefined;

  const interrupts = messages.at(-1)?.attrs?.tool_call?.interrupts ?? [];
  const disabled =
    loading ||
    (interrupts.length === 0 && (!query || query.trim().length === 0));

  const handleSend = useCallback(() => {
    const v = query.trim();
    if (v) {
      const localTools = [...tools];
      const localContext = structuredClone(selectedResources);
      const displayParts = inputRef.current?.getDisplayParts();
      const localDisplayParts = displayParts?.some(part => part.type !== 'text')
        ? displayParts
        : undefined;
      clearComposerAfterSend();
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
    approvalMode,
    clearComposerAfterSend,
    inputRef,
    mode,
    query,
    selectedResources,
    sendMessage,
    tools,
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
        initialComposerState={composerInitialState}
        onComposerStateChange={handleComposerStateChange}
        tools={composerTools}
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
            tools={composerTools}
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
