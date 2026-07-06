/** Renders the compact side index for completed chat turns. */
import { useEffect, useMemo, useState } from 'react';

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/HoverCard';
import type { MessageDetail } from '@/page/chat/core/types/conversation';

import { buildMessageIndexItems } from './messageGroups';

export function MessageIndex({ messages }: { messages: MessageDetail[] }) {
  const items = useMemo(() => buildMessageIndexItems(messages), [messages]);
  const [visibleMessageIds, setVisibleMessageIds] = useState<Set<string>>(
    () => new Set()
  );
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  function scrollToMessage(messageId: string) {
    const target = document.getElementById(`message-${messageId}`);
    if (!target) {
      return;
    }

    window.history.pushState(null, '', `#message-${messageId}`);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  useEffect(() => {
    setVisibleMessageIds(new Set());

    const elements = items
      .flatMap(item => [item.targetMessageId, item.answerMessageId])
      .map(id => document.getElementById(`message-${id}`))
      .filter((element): element is HTMLElement => Boolean(element));

    if (elements.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        setVisibleMessageIds(current => {
          const next = new Set(current);

          for (const entry of entries) {
            const messageId = entry.target.id.replace(/^message-/, '');
            if (entry.isIntersecting) {
              next.add(messageId);
            } else {
              next.delete(messageId);
            }
          }

          return next;
        });
      },
      { threshold: 0.1 }
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, [items]);

  if (items.length < 3) {
    return null;
  }

  return (
    <nav
      aria-label="Message index"
      className="absolute -left-14 top-0 hidden h-full w-10 lg:block"
    >
      <div className="sticky top-4 flex max-h-[calc(100vh-16rem)] flex-col items-start overflow-y-auto py-2 pt-8">
        {items.map((item, index) => {
          const active =
            hoveredIndex === null &&
            (visibleMessageIds.has(item.targetMessageId) ||
              visibleMessageIds.has(item.answerMessageId));
          const hoverDistance =
            hoveredIndex === null ? undefined : Math.abs(hoveredIndex - index);
          const width = ['w-5', 'w-4', 'w-3'][hoverDistance ?? 3] ?? 'w-2';

          return (
            <HoverCard
              key={item.id}
              closeDelay={0}
              open={hoveredIndex === index}
              openDelay={0}
            >
              <HoverCardTrigger asChild>
                <a
                  aria-label={item.query}
                  className="flex h-3 w-5 items-center justify-start"
                  href={`#message-${item.targetMessageId}`}
                  onBlur={() => setHoveredIndex(null)}
                  onClick={event => {
                    event.preventDefault();
                    setHoveredIndex(index);
                    scrollToMessage(item.targetMessageId);
                  }}
                  onFocus={() => setHoveredIndex(index)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <span
                    className={`h-0.5 ${width} rounded-full transition-all ${
                      active || hoverDistance === 0
                        ? 'bg-foreground'
                        : 'bg-muted-foreground/35'
                    }`}
                  />
                </a>
              </HoverCardTrigger>
              <HoverCardContent
                className="w-80 rounded-xl p-3 !animate-none"
                side="right"
              >
                <p className="truncate text-sm font-medium">{item.query}</p>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {item.answer}
                </p>
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </div>
    </nav>
  );
}
