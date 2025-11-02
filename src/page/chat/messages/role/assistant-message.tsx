import { Loader2Icon } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
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
}

export function AssistantMessage(props: IProps) {
  const {
    message,
    citations,
    messages,
    conversation,
    messageOperator,
    onRegenerate,
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
        key="reasoning"
        defaultValue={message.id}
        className="mb-3"
      >
        <AccordionItem value={message.id}>
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
      />
    );
  }
  if (openAIMessage.tool_calls) {
    const lastMessage = messages[messages.length - 1];
    domList.push(
      <div
        key="tool-calls"
        hidden={
          lastMessage.id !== message.id &&
          !(
            lastMessage.message.role === OpenAIMessageRole.TOOL &&
            lastMessage.status === MessageStatus.PENDING
          )
        }
      >
        <Button disabled size="sm" variant="secondary">
          <Loader2Icon className="animate-spin" />
          {t('chat.searching')}
        </Button>
      </div>
    );
  }
  return domList.length === 1 ? domList[0] : domList;
}
