import { ChevronLeft, ChevronRight, Loader2Icon } from 'lucide-react';
import React, { useMemo } from 'react';
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

  const siblings = useMemo(() => {
    return messageOperator.getSiblings(message.id);
  }, [messageOperator, message.id, conversation.mapping]);

  const currentIndex = siblings.indexOf(message.id);
  const hasSiblings = siblings.length > 1;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      messageOperator.activate(siblings[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < siblings.length - 1) {
      messageOperator.activate(siblings[currentIndex + 1]);
    }
  };

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
      <div key="content">
        <CitationMarkdown
          status={message.status}
          content={openAIMessage.content?.trim()}
          citations={citations}
          conversation={conversation}
          messageId={message.id}
          onRegenerate={onRegenerate}
        />
        {hasSiblings && (
          <div className="flex items-center gap-1 ml-[-6px]">
            <Button
              size="icon"
              variant="ghost"
              className="p-0 w-7 h-7"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[3ch] text-center">
              {currentIndex + 1}/{siblings.length}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="p-0 w-7 h-7"
              onClick={handleNext}
              disabled={currentIndex === siblings.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
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
