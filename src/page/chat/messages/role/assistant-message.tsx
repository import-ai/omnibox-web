import { MessageDetail } from '@/page/chat/types/conversation.tsx';
import type { Citation } from '@/page/chat/types/chat-response.tsx';
import { cleanIncompletedCitation } from '@/page/chat/utils.ts';
import ReactMarkdown from 'react-markdown';
import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import { CitationHoverIcon } from '@/page/chat/messages/citations/citation-hover-icon';
import { Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';

function splitContentWithCitations(content: string) {
  const regex = /<cite:(\d+)>/g;
  const result: Array<{
    type: 'text' | 'cite';
    value: string;
    index?: number;
  }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      result.push({
        type: 'text',
        value: content.slice(lastIndex, match.index),
      });
    }
    result.push({
      type: 'cite',
      value: match[0],
      index: Number(match[1]) - 1,
    });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    result.push({ type: 'text', value: content.slice(lastIndex) });
  }
  return result;
}

function renderAssistantContent(content: string, citations: Citation[]) {
  const cleanedContent = cleanIncompletedCitation(content);
  const segments = splitContentWithCitations(cleanedContent);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          <ReactMarkdown key={i} components={{ p: 'span' }}>
            {seg.value}
          </ReactMarkdown>
        ) : (
          seg.index! < citations.length && (
            <CitationHoverIcon
              key={i}
              citation={citations[seg.index!]}
              index={seg.index!}
            />
          )
        ),
      )}
    </span>
  );
}

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
      <div key="content">
        {renderAssistantContent(openAIMessage.content?.trim(), citations)}
      </div>,
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
