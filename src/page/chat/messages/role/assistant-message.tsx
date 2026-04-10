import { Check, MessageCircleWarning, X } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Spinner } from '@/components/ui/spinner';
import { MessageOperator } from '@/page/chat/conversation/message-operator';
import { CitationMarkdown } from '@/page/chat/messages/citations/citation-markdown.tsx';
import { useMessageSiblings } from '@/page/chat/messages/hooks/useMessageSiblings';
import {
  Citation,
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/types/chat-response';
import type {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/types/conversation';

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
  name: string;
  args: string;
  status: MessageStatus;
}

function toolStateIcon(status: MessageStatus) {
  switch (status) {
    case MessageStatus.PENDING:
      return <Spinner className="inline-block size-4" />;
    case MessageStatus.INTERRUPTED:
      return <MessageCircleWarning className="inline-block size-4" />;
    case MessageStatus.STREAMING:
      return <Spinner className="inline-block size-4" />;
    case MessageStatus.SUCCESS:
      return <Check className="inline-block size-4 text-green-600" />;
    case MessageStatus.FAILED:
      return <X className="inline-block size-4 text-red-600" />;
    default:
      return null;
  }
}

function pathI18n(
  path: string,
  mapping: { private: string; teamspace: string }
): string {
  for (const [key, value] of Object.entries(mapping)) {
    if (path.startsWith('/' + key)) {
      return '/' + value + path.slice(key.length + 1);
    }
  }
  return path;
}

function parseArgs(
  args: Record<string, any>,
  mapping: { private: string; teamspace: string }
): string {
  return Object.values(args)
    .map(v => {
      const vStr = `${v}`;
      const processedV = trimMiddle(pathI18n(vStr, mapping));
      return `"${processedV}"`;
    })
    .join(' ');
}

function trimMiddle(str: string, maxLength: number = 20): string {
  if (str.length <= maxLength) return str;

  const ellipsis = '...';
  const charsToShow = maxLength - ellipsis.length;

  const front = Math.ceil(charsToShow / 2);
  const back = Math.floor(charsToShow / 2);

  const trimmed = str.slice(0, front) + ellipsis + str.slice(str.length - back);
  return trimmed.replaceAll('\n', ' ');
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
        key="content"
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
        `chat.messages.tool_calls.function_name.${toolCall.function.name}`
      );
      const args: string = parseArgs(JSON.parse(toolCall.function.arguments), {
        private: t('chat.messages.tool_calls.function_args.private'),
        teamspace: t('chat.messages.tool_calls.function_args.teamspace'),
      });
      let functionStatus: MessageStatus = MessageStatus.PENDING;
      const toolMessage = messages.find(
        m =>
          m.message.role === OpenAIMessageRole.TOOL &&
          m.message.tool_call_id === toolCall.id &&
          m.status === MessageStatus.SUCCESS
      );
      if (toolMessage) {
        functionStatus = MessageStatus.STREAMING;
      }
      const toolCallMeta = toolMessage?.attrs?.tool_call;
      const toolCallSuccess: boolean | undefined = toolCallMeta?.success;
      if (toolCallSuccess === true) {
        functionStatus = MessageStatus.SUCCESS;
      } else if (toolCallSuccess === false) {
        functionStatus = MessageStatus.FAILED;
      }
      toolCalls.push({
        name: functionName,
        args,
        status: functionStatus,
      });
    }
  }
  if (message.attrs?.tool_call?.interrupts) {
    for (const interrupt of message.attrs.tool_call.interrupts) {
      const args: string = parseArgs(interrupt.args, {
        private: t('chat.messages.tool_calls.function_args.private'),
        teamspace: t('chat.messages.tool_calls.function_args.teamspace'),
      });
      const functionName = t(
        `chat.messages.tool_calls.function_name.${interrupt.name}`
      );

      for (const toolCall of toolCalls) {
        if (
          toolCall.name === functionName &&
          toolCall.args === args &&
          toolCall.status === MessageStatus.PENDING
        ) {
          toolCall.status = MessageStatus.INTERRUPTED;
        }
      }
    }
  }

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
              {toolCalls.filter(
                t =>
                  ![MessageStatus.SUCCESS, MessageStatus.FAILED].includes(
                    t.status
                  )
              ).length > 0 && <Spinner className="inline-block size-4" />}
              &nbsp;
              {t('chat.tools.tool_calls')}
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-gray-500 dark:text-gray-400">
            <ul>
              {toolCalls.map((toolCall, index) => {
                return (
                  <li key={'tool_call_' + toolCall.name + '_' + index}>
                    <pre>
                      {toolStateIcon(toolCall.status)}
                      &nbsp;
                      <b>{toolCall.name}</b> {toolCall.args}
                    </pre>
                  </li>
                );
              })}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }
  return domList.length === 1 ? domList[0] : domList;
}
