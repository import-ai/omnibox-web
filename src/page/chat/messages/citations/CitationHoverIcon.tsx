import { type MouseEvent, useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/HoverCard';
import { useChatRouteParams } from '@/page/chat/ChatRouteParamsContext';
import type { Citation } from '@/page/chat/core/types/chatResponse';
import {
  appendLineNumber,
  getCitationLineNumber,
} from '@/page/chat/messages/citations/citationUtils';
import { formatCitation } from '@/page/chat/messages/citations/utils';
import { useChatResourceNavigation } from '@/page/chat/useChatResourceNavigation';
import { resolveCitationTarget } from '@/page/copilot/citationTarget';

export interface CitationIconProps {
  index: number;
  citation: Citation;
}

export function CitationHoverIcon(props: CitationIconProps) {
  const { citation, index } = props;
  const { name, link } = formatCitation(citation);
  const lineNumber = getCitationLineNumber(citation.id);
  const { namespaceId } = useChatRouteParams();
  const { openResource } = useChatResourceNavigation();
  const [hoverCardOpen, setHoverCardOpen] = useState(false);

  const openCitation = (event: MouseEvent<HTMLElement>) => {
    const target = resolveCitationTarget(citation.link, namespaceId);
    if (
      target.kind === 'resource' &&
      namespaceId &&
      openResource(event, target.resourceId, lineNumber)
    ) {
      return;
    }
    if (target.kind !== 'unavailable' && link) {
      window.open(
        target.kind === 'resource' ? appendLineNumber(link, lineNumber) : link,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };
  return (
    <HoverCard open={hoverCardOpen} onOpenChange={setHoverCardOpen}>
      <HoverCardTrigger asChild>
        <Button
          variant="link"
          className="px-0 py-0 h-auto align-baseline hover:no-underline"
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.blur();
            setHoverCardOpen(false);
            openCitation(e);
          }}
        >
          <Badge
            variant="secondary"
            className="rounded-full px-1 hover:text-primary-foreground hover:bg-primary dark:hover:bg-primary dark:bg-[#303030]"
          >
            {index + 1}
          </Badge>
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div>
          <p className="font-semibold line-clamp-2">{citation.title}</p>
          <div className="text-sm line-clamp-4">{citation.snippet}</div>
          <div className="text-muted-foreground text-xs mt-1">{name}</div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
