import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Citation } from '@/page/chat/types/chat-response';

export interface CitationIconProps {
  index: number;
  citation: Citation;
}

export function CitationHoverIcon(props: CitationIconProps) {
  const { citation, index } = props;
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button
          variant="link"
          className="px-0 py-0 h-auto align-baseline hover:no-underline"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = '../' + citation.link;
            if (url) window.open(url, '_blank', 'noopener,noreferrer');
          }}
        >
          <Badge
            variant="secondary"
            className="rounded-full px-1 hover:text-primary-foreground hover:bg-primary"
          >
            {index + 1}
          </Badge>
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div>
          <h3 className="text-sm font-semibold">{citation.title}</h3>
          <div className="text-sm">{citation.snippet}</div>
          <div className="text-muted-foreground text-xs">@{citation.link}</div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
