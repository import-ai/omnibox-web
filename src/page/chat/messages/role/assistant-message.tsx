import { Check } from 'lucide-react';
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
import type { Citation } from '@/page/chat/types/chat-response';
import {
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
  if (openAIMessage.tool_calls) {
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
              {message.status !== MessageStatus.SUCCESS && (
                <Spinner className="inline-block size-4" />
              )}
              &nbsp;
              {t('chat.tools.tool_calls')}
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-gray-500 dark:text-gray-400">
            <ul>
              {openAIMessage.tool_calls.map((toolCall, index) => {
                const args: string = Object.values(
                  JSON.parse(toolCall.function.arguments)
                )
                  .map(v => `"${trimMiddle(v as string)}"`)
                  .join(' ');
                const toolMessage = messages.find(
                  m =>
                    m.message.role === OpenAIMessageRole.TOOL &&
                    m.message.tool_call_id === toolCall.id &&
                    m.status === MessageStatus.SUCCESS
                );
                return (
                  <li key={'tool_call_' + toolCall.id + '_' + index}>
                    <pre>
                      {toolMessage === undefined ? (
                        <Spinner className="inline-block size-4" />
                      ) : (
                        <Check className="inline-block size-4" />
                      )}
                      &nbsp;
                      <b>{toolCall.function.name}</b> {args}
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
