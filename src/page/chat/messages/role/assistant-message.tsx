import { MessageDetail } from '@/page/chat/types/conversation';
import type { Citation } from '@/page/chat/types/chat-response';
import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CitationMarkdown } from '@/page/chat/messages/citations/citation-markdown';

const citeRegex = /\[\[(\d+)]]/g;

interface IProps {
  message: MessageDetail;
  messages: MessageDetail[];
  citations: Citation[];
}

export function AssistantMessage(props: IProps) {
  const { message, citations, messages } = props;
  const openAIMessage = message.message;

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
          <AccordionTrigger>Reasoning</AccordionTrigger>
          <AccordionContent className="text-gray-500 dark:text-gray-400">
            {openAIMessage.reasoning_content?.trim()}
          </AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
  }
  if (openAIMessage.content?.trim()) {
    domList.push(
      <CitationMarkdown
        key="content"
        content={openAIMessage.content?.trim()}
        citations={citations}
        citePattern={citeRegex}
      />,
    );
  }
  if (openAIMessage.tool_calls) {
    domList.push(
      <div
        key="tool-calls"
        hidden={messages[messages.length - 1].id !== message.id}
      >
        <Button disabled size="sm" variant="secondary">
          <Loader2Icon className="animate-spin" />
          Searching...
        </Button>
      </div>,
    );
  }
  return domList.length === 1 ? domList[0] : domList;
}
