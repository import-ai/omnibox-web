import { Check, ChevronDown, Hand, ShieldCheck, ShieldX } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
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
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse.ts';
import {
  Interrupt,
  MessageDetail,
} from '@/page/chat/core/types/conversation.ts';
import { getLatestContextCompactCapacity } from '@/page/chat/messages/role/assistantMessageUtils';

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

function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) {
    return `${Math.round(tokens / 1000)}k`;
  }
  return String(tokens);
}

function ContextCapacityIndicator({
  capacity,
}: {
  capacity: NonNullable<ReturnType<typeof getLatestContextCompactCapacity>>;
}) {
  const { t } = useTranslation();
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - capacity.percent / 100);
  const remainingPercent = 100 - capacity.percent;
  const usageLabel = t('chat.messages.context_capacity.ratio', {
    used: capacity.percent,
    remaining: remainingPercent,
  });

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <span
          role="img"
          tabIndex={0}
          className="flex size-8 cursor-help items-center justify-center text-muted-foreground"
          aria-label={usageLabel}
        >
          <svg
            aria-hidden="true"
            className="size-4 -rotate-90"
            viewBox="0 0 20 20"
          >
            <circle
              cx="10"
              cy="10"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="opacity-25"
            />
            <circle
              cx="10"
              cy="10"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
        </span>
      </TooltipTrigger>
      <TooltipContent
        className="max-w-[calc(100vw-2rem)] whitespace-nowrap text-center"
        side="top"
      >
        <div>{usageLabel}</div>
        <div>
          {t('chat.messages.context_capacity.tokens', {
            estimated: formatTokenCount(capacity.estimatedTokens),
            trigger: formatTokenCount(capacity.triggerTokens),
          })}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface IProps {
  messages: MessageDetail[];
  navigatePrefix: string;
  selectedResources: IResTypeContext[];
  setSelectedResources: any;
  initialApprovalMode?: ApprovalMode;
  approvalModeResetKey?: string;
  loading: boolean;
  sendMessage: ({
    query,
    tools,
    selectedResources,
    mode,
    decisions,
  }: SendMessageParams) => void;
}

function ApprovalModeSelect({
  approvalMode,
  setApprovalMode,
}: {
  approvalMode: ApprovalMode;
  setApprovalMode: (mode: ApprovalMode) => void;
}) {
  const { t } = useTranslation();
  const options = [
    { value: 'manual', Icon: Hand },
    { value: 'auto_approve', Icon: ShieldCheck },
    { value: 'auto_reject', Icon: ShieldX },
  ] as const;
  const TriggerIcon = options.find(
    option => option.value === approvalMode
  )?.Icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 pl-2 pr-1 text-xs font-normal"
        >
          {TriggerIcon && <TriggerIcon className="size-4" />}
          {t(`chat.decision.mode.${approvalMode}`)}
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-80 p-2">
        {options.map(({ value, Icon }) => (
          <DropdownMenuItem
            key={value}
            className="grid cursor-pointer grid-cols-[28px_minmax(0,1fr)_20px] items-start gap-3 rounded-md px-2 py-2.5"
            onClick={() => setApprovalMode(value)}
          >
            <Icon className="mt-0.5 size-5 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-sm font-medium">
                {t(`chat.decision.mode.${value}`)}
              </span>
              <span className="mt-1 block whitespace-normal text-xs leading-5 text-muted-foreground">
                {t(`chat.decision.mode_description.${value}`)}
              </span>
            </span>
            {approvalMode === value && (
              <Check className="mt-1 size-4 text-muted-foreground" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ChatArea(props: IProps) {
  const {
    messages,
    navigatePrefix,
    selectedResources,
    setSelectedResources,
    initialApprovalMode,
    approvalModeResetKey,
    loading,
    sendMessage,
  } = props;

  const [tools, setTools] = useState<ToolType[]>([]);
  const [mode, setMode] = useState<ChatMode>(ChatMode.ASK);
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(
    initialApprovalMode ?? 'manual'
  );
  const [query, setQuery] = useState('');
  const toolsManuallyChangedRef = useRef(false);
  const restoredToolsConversationKeyRef = useRef<string | null>(null);
  const restoredToolsSignatureRef = useRef<string | null>(null);
  const restoredTools = useMemo(() => getRestoredTools(messages), [messages]);
  const contextCompactCapacity = getLatestContextCompactCapacity(messages);

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

  useEffect(() => {
    setApprovalMode(initialApprovalMode ?? 'manual');
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
        approvalMode,
      });
    }
  }, [
    query,
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
        <div className="flex min-w-0 items-center gap-2">
          <ChatTool
            tools={tools}
            context={selectedResources}
            onToolsChange={handleToolsChange}
          />
          <ApprovalModeSelect
            approvalMode={approvalMode}
            setApprovalMode={setApprovalMode}
          />
        </div>
        <div className="flex items-center gap-2">
          {contextCompactCapacity && (
            <ContextCapacityIndicator capacity={contextCompactCapacity} />
          )}
          <ChatAction
            onSend={handleSend}
            disabled={disabled}
            loading={loading}
            mode={mode}
            setMode={setMode}
          />
        </div>
      </div>
    </div>
  );
}
