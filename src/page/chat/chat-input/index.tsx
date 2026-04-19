import { useCallback, useMemo, useState } from 'react';

import DecisionInput from '@/page/chat/chat-input/decision-input.tsx';
import {
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

import ChatAction from './action';
import ChatTool from './chat-tool';
import ChatContext from './context';
import ChatInput from './input';

interface IProps {
  messages: MessageDetail[];
  navigatePrefix: string;
  selectedResources: IResTypeContext[];
  setSelectedResources: any;
  loading: boolean;
  sendMessage: ({
    query,
    tools,
    selectedResources,
    mode,
    decisions,
  }: SendMessageParams) => void;
}

export default function ChatArea(props: IProps) {
  const {
    messages,
    navigatePrefix,
    selectedResources,
    setSelectedResources,
    loading,
    sendMessage,
  } = props;

  const [tools, setTools] = useState<ToolType[]>([]);
  const [mode, setMode] = useState<ChatMode>(ChatMode.ASK);
  const [query, setQuery] = useState('');

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
      inputMode === InputMode.TEXT && (!query || query.trim().length === 0)
    );
  }, [query, inputMode]);

  const handleSend = useCallback(() => {
    const v = query.trim();
    if (v) {
      setQuery('');
      const localContext = structuredClone(selectedResources);
      setSelectedResources([]);
      sendMessage({
        query: v,
        selectedResources: localContext,
        tools,
        mode,
      });
    }
  }, [
    query,
    selectedResources,
    setSelectedResources,
    tools,
    mode,
    sendMessage,
  ]);

  return interrupts.length > 0 ? (
    <DecisionInput interrupts={interrupts} sendMessage={sendMessage} />
  ) : (
    <div className="max-w-[766px] w-full mx-auto rounded-[12px] p-3 border border-solid border-gray-200 bg-white dark:bg-[#303030] dark:border-[#303030]">
      <ChatContext
        value={selectedResources}
        onChange={setSelectedResources}
        navigatePrefix={navigatePrefix}
      />
      <ChatInput
        value={query}
        onChange={setQuery}
        onSend={handleSend}
        disabled={disabled}
      />
      <div className="flex items-center justify-between">
        <ChatTool
          tools={tools}
          context={selectedResources}
          onToolsChange={setTools}
        />
        <ChatAction
          onSend={handleSend}
          disabled={disabled}
          loading={loading}
          mode={mode}
          setMode={setMode}
        />
      </div>
    </div>
  );
}
