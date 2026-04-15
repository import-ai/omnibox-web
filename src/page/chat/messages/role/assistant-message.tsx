import { Ban, Check, MessageCircleWarning, X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Spinner } from '@/components/ui/spinner';
import useApp from '@/hooks/use-app';
import { joinArgs, processArgs } from '@/lib/tool-args';
import { MessageOperator } from '@/page/chat/conversation/message-operator';
import { CitationMarkdown } from '@/page/chat/messages/citations/citation-markdown.tsx';
import { useMessageSiblings } from '@/page/chat/messages/hooks/useMessageSiblings';
import {
  Citation,
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/types/chat-response';
import {
  ConversationDetail,
  MessageDetail,
  ToolCallFrontendOperation,
} from '@/page/chat/types/conversation';
import { ToolCallStatus } from '@/page/chat/types/tool-call.ts';

interface IProps {
  conversation: ConversationDetail;
  message: MessageDetail;
  messages: MessageDetail[];
  citations: Citation[];
  messageOperator: MessageOperator;
  onRegenerate: (messageId: string) => void;
  isLastMessage: boolean;
}

interface IToolCall {
  toolCallId: string;
  toolMessageId?: string;
  inStreaming?: boolean;
  name: string;
  args: string[];
  status: ToolCallStatus;
  joinedArgs: string;
  operations?: ToolCallFrontendOperation[];
}

function toolStateIcon(status: ToolCallStatus) {
  switch (status) {
    case ToolCallStatus.PENDING:
      return <Spinner className="size-4" />;
    case ToolCallStatus.INTERRUPTED:
      return <MessageCircleWarning className="size-4" />;
    case ToolCallStatus.RUNNING:
      return <Spinner className="size-4" />;
    case ToolCallStatus.SUCCESS:
      return <Check className="size-4 text-green-600" />;
    case ToolCallStatus.FAILED:
      return <X className="size-4 text-red-600" />;
    case ToolCallStatus.REJECTED:
      return <Ban className="size-4 text-red-600" />;
    default:
      return null;
  }
}

export function AssistantMessage(props: IProps) {
  const {
    message,
    citations,
    messages,
    conversation,
    messageOperator,
    onRegenerate,
    isLastMessage,
  } = props;
  const { t } = useTranslation();
  const app = useApp();
  const openAIMessage = message.message;

  const { siblings, currentIndex, hasSiblings, handlePrevious, handleNext } =
    useMessageSiblings(message.id, messageOperator);

  const domList: React.ReactNode[] = [];
  if (openAIMessage.reasoning_content?.trim()) {
    domList.push(
      <Accordion
        type="single"
        collapsible
        key={'reasoning_' + message.id}
        defaultValue={'reasoning_' + message.id}
        className="mb-3"
      >
        <AccordionItem value={'reasoning_' + message.id}>
          <AccordionTrigger>{t('chat.tools.reasoning')}</AccordionTrigger>
          <AccordionContent className="text-gray-500 dark:text-gray-400">
            {openAIMessage.reasoning_content?.trim()}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }
  if (openAIMessage.content?.trim()) {
    domList.push(
      <CitationMarkdown
        key={'content_' + message.id}
        status={message.status}
        content={openAIMessage.content?.trim()}
        citations={citations}
        conversation={conversation}
        messageId={message.id}
        onRegenerate={onRegenerate}
        hasSiblings={hasSiblings}
        currentIndex={currentIndex}
        siblingsLength={siblings.length}
        onPrevious={handlePrevious}
        onNext={handleNext}
        isLastMessage={isLastMessage}
      />
    );
  }

  const toolCalls: IToolCall[] = [];

  if (openAIMessage.tool_calls) {
    for (const toolCall of openAIMessage.tool_calls) {
      const functionName = t(
        `chat.messages.tool_calls.function_name.${toolCall.function.name}`,
        t('chat.messages.tool_calls.function_name.unknown')
      );
      const args: string[] = processArgs(
        JSON.parse(toolCall.function.arguments),
        t
      );
      let functionStatus: ToolCallStatus = ToolCallStatus.PENDING;
      const toolMessage = messages.find(
        m =>
          m.message.role === OpenAIMessageRole.TOOL &&
          m.message.tool_call_id === toolCall.id &&
          m.status === MessageStatus.SUCCESS
      );
      if (toolMessage) {
        functionStatus = ToolCallStatus.RUNNING;
      }
      const toolCallMeta = toolMessage?.attrs?.tool_call;
      const toolCallStatus: string | undefined = toolCallMeta?.status;
      if (toolCallStatus === ToolCallStatus.SUCCESS) {
        functionStatus = ToolCallStatus.SUCCESS;
      } else if (toolCallStatus === ToolCallStatus.FAILED) {
        functionStatus = ToolCallStatus.FAILED;
      } else if (toolCallStatus === ToolCallStatus.REJECTED) {
        functionStatus = ToolCallStatus.REJECTED;
      }

      toolCalls.push({
        toolCallId: toolCall.id,
        toolMessageId: toolMessage?.id,
        inStreaming: toolMessage?.attrs?.tool_call?.in_streaming,
        operations: toolMessage?.attrs?.tool_call?.operations,
        name: functionName,
        args,
        status: functionStatus,
        joinedArgs: joinArgs(args),
      });
    }
  }
  if (message.attrs?.tool_call?.interrupts) {
    for (const interrupt of message.attrs.tool_call.interrupts) {
      const args: string[] = processArgs(interrupt.args, t);
      const functionName = t(
        `chat.messages.tool_calls.function_name.${interrupt.name}`
      );

      for (const toolCall of toolCalls) {
        if (
          toolCall.name === functionName &&
          toolCall.joinedArgs === joinArgs(args) &&
          toolCall.status === ToolCallStatus.PENDING
        ) {
          toolCall.status = ToolCallStatus.INTERRUPTED;
        }
      }
    }
  }

  const processedToolMessageIds = useRef<Set<string>>(new Set());

  const hasPendingToolCalls =
    toolCalls.length > 0 &&
    toolCalls.filter(
      t =>
        ![
          ToolCallStatus.SUCCESS,
          ToolCallStatus.FAILED,
          ToolCallStatus.REJECTED,
        ].includes(t.status)
    ).length > 0;

  useEffect(() => {
    if (toolCalls.length === 0 || hasPendingToolCalls) return;
    const operations: ToolCallFrontendOperation[] = [];
    for (const toolCall of toolCalls) {
      if (
        toolCall.inStreaming &&
        toolCall.toolMessageId &&
        toolCall.operations &&
        toolCall.operations.length > 0 &&
        !processedToolMessageIds.current.has(toolCall.toolMessageId)
      ) {
        for (const operation of toolCall.operations) {
          operations.push(operation);
          processedToolMessageIds.current.add(toolCall.toolMessageId);
        }
      }
    }
    if (operations.length === 0) return;
    const deduplicatedOperations: ToolCallFrontendOperation[] = [];
    for (const operation of operations) {
      if (
        !deduplicatedOperations.some(
          o =>
            o.name === operation.name &&
            o.args?.resource_id === operation.args?.resource_id
        )
      ) {
        deduplicatedOperations.push(operation);
      }
    }
    for (const operation of deduplicatedOperations) {
      app.fire(operation.name, operation.args?.resource_id);
    }
  }, [toolCalls, hasPendingToolCalls]);

  if (toolCalls.length > 0) {
    domList.push(
      <Accordion
        type="single"
        collapsible
        key={'tool_calls' + message.id}
        defaultValue={'tool_calls_' + message.id}
        className="mb-3"
      >
        <AccordionItem value={'tool_calls_' + message.id}>
          <AccordionTrigger>
            <span>
              {hasPendingToolCalls && (
                <span>
                  <Spinner className="inline-block size-4" />
                  &nbsp;
                </span>
              )}
              {t('chat.tools.tool_calls')}
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-gray-500 dark:text-gray-400">
            <ul>
              {toolCalls.map((toolCall, index) => (
                <li
                  key={'tool_call_' + toolCall.name + '_' + index}
                  className="flex items-center gap-2"
                >
                  {toolStateIcon(toolCall.status)}
                  <b>{toolCall.name}</b>
                  {toolCall.args.map((arg, argIndex) => (
                    <code
                      key={'arg_' + argIndex}
                      className="bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded text-xs font-mono"
                    >
                      {arg}
                    </code>
                  ))}
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }
  if (
    [MessageStatus.PENDING, MessageStatus.STREAMING].includes(message.status)
  ) {
    domList.push(
      <Spinner key={'response_loading_' + message.id} className="size-4" />
    );
  }
  return domList.length === 1 ? domList[0] : domList;
}
