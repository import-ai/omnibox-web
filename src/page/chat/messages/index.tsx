import { cn } from '@/lib/utils';
import React from 'react';
import type { MessageDetail } from '@/page/chat/types/conversation';
import {
  type Citation,
  OpenAIMessageRole,
} from '@/page/chat/types/chat-response';
import ReactMarkdown from 'react-markdown';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { cleanIncompletedCitation } from '@/page/chat/utils';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface IProps {
  messages: MessageDetail[];
}

export function Messages(props: IProps) {
  const { messages } = props;
  const citations = React.useMemo((): Citation[] => {
    const result: Citation[] = [];
    for (const message of messages) {
      if (message.attrs?.citations && message.attrs.citations.length > 0) {
        result.push(...message.attrs.citations);
      }
    }
    return result;
  }, [messages]);

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
              <HoverCard key={i}>
                <HoverCardTrigger asChild>
                  <Button
                    variant="link"
                    className="px-1 py-0 h-auto align-baseline hover:no-underline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const url = '../' + citations[seg.index!]?.link;
                      if (url)
                        window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <Badge
                      variant="secondary"
                      className="rounded-full px-1 hover:text-primary-foreground hover:bg-primary"
                    >
                      {seg.index! + 1}
                    </Badge>
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div>
                    <h3 className="text-sm font-semibold">
                      {citations[seg.index!]?.title}
                    </h3>
                    <div className="text-sm">
                      {citations[seg.index!]?.snippet}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      @{citations[seg.index!]?.link}
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )
          ),
        )}
      </span>
    );
  }

  function renderMessage(message: MessageDetail) {
    const openAIMessage = message.message;

    if (openAIMessage.role === OpenAIMessageRole.USER) {
      return (
        <div
          className={cn(
            'flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2',
            'ml-auto bg-secondary text-secondary-foreground',
          )}
        >
          {openAIMessage.content}
        </div>
      );
    } else if (openAIMessage.role === OpenAIMessageRole.ASSISTANT) {
      const domList: React.ReactNode[] = [];
      if (openAIMessage.reasoning_content?.trim()) {
        domList.push(
          <Accordion type="single" collapsible key="reasoning">
            <AccordionItem value="item-1">
              <AccordionTrigger>Reasoning</AccordionTrigger>
              <AccordionContent>
                {openAIMessage.reasoning_content?.trim()}
              </AccordionContent>
            </AccordionItem>
          </Accordion>,
        );
      }
      if (openAIMessage.content?.trim()) {
        domList.push(
          <React.Fragment key="content">
            {renderAssistantContent(openAIMessage.content?.trim(), citations)}
          </React.Fragment>,
        );
      }
      if (openAIMessage.tool_calls) {
        domList.push(
          <React.Fragment key="tool-calls">Searching...</React.Fragment>,
        );
      }
      return domList.length === 1 ? domList[0] : domList;
    } else if (openAIMessage.role === OpenAIMessageRole.TOOL) {
      return (
        <>
          <p>Role: {openAIMessage.role}</p>
          <p>Citations:</p>
          <pre>{JSON.stringify(message.attrs?.citations || [], null, 2)}</pre>
        </>
      );
    }
  }

  return (
    <>
      <div className="space-y-4">
        {messages.map((message) => (
          <React.Fragment key={message.id!}>
            {renderMessage(message)}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}
