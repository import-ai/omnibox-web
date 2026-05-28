import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import DecisionInput from '@/page/chat/chat-input/DecisionInput';
import {
  ChatMode,
  InputMode,
  IResTypeContext,
  SendMessageParams,
  ToolType,
} from '@/page/chat/chat-input/types';
import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse.ts';
import {
  Interrupt,
  MessageDetail,
} from '@/page/chat/core/types/conversation.ts';

import ChatAction from './ChatAction';
import ChatContext from './ChatContext';
import ChatInput from './ChatInput';
import ChatTool from './ChatTool';

interface RestoredTools {
  conversationKey: string;
  signature: string;
  tools: ToolType[];
  ready: boolean;
}

interface RestoredTools {
  conversationKey: string;
  signature: string;
  tools: ToolType[];
  ready: boolean;
}

function getRestoredTools(messages: MessageDetail[]): RestoredTools {
  const conversationKey = messages[0]?.id ?? 'empty';
  const userMessage = messages
    .slice()
    .reverse()
    .find(message => message.message.role === OpenAIMessageRole.USER);

  if (!userMessage) {
    return {
      conversationKey,
      signature: 'empty',
      tools: [],
      ready: true,
    };
  }

  const tools: ToolType[] = [];
  if (
    userMessage.attrs?.tools?.some(tool => tool.name === ToolType.WEB_SEARCH)
  ) {
    tools.push(ToolType.WEB_SEARCH);
  }
  if (userMessage.attrs?.enable_thinking) {
    tools.push(ToolType.REASONING);
  }

  return {
    conversationKey,
    signature: `${userMessage.id}:${tools.join(',')}`,
    tools,
    ready:
      Boolean(userMessage.attrs) ||
      userMessage.status !== MessageStatus.PENDING,
  };
}
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
  const toolsManuallyChangedRef = useRef(false);
  const restoredToolsConversationKeyRef = useRef<string | null>(null);
  const restoredToolsSignatureRef = useRef<string | null>(null);
  const restoredTools = useMemo(() => getRestoredTools(messages), [messages]);

  useEffect(() => {
    if (!restoredTools.ready) {
      return;
    }

    if (
      restoredToolsConversationKeyRef.current !== restoredTools.conversationKey
    ) {
      restoredToolsConversationKeyRef.current = restoredTools.conversationKey;
      restoredToolsSignatureRef.current = null;
      toolsManuallyChangedRef.current = false;
    }

    if (toolsManuallyChangedRef.current) {
      return;
    }

    if (restoredToolsSignatureRef.current === restoredTools.signature) {
      return;
    }

    restoredToolsSignatureRef.current = restoredTools.signature;
    setTools(restoredTools.tools);
  }, [restoredTools]);

  const handleToolsChange = useCallback((nextTools: ToolType[]) => {
    toolsManuallyChangedRef.current = true;
    setTools(nextTools);
  }, []);

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
      toolsManuallyChangedRef.current = false;
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
    <div className="max-w-[766px] w-full mx-auto rounded-2xl p-3 border border-solid border-gray-200 bg-white dark:bg-[#303030] dark:border-[#303030]">
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
          onToolsChange={handleToolsChange}
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
