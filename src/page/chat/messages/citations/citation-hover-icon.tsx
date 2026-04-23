import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import type { Citation } from '@/page/chat/core/types/chat-response';
import { formatCitation } from '@/page/chat/messages/citations/utils';

export interface CitationIconProps {
  index: number;
  citation: Citation;
}

export function CitationHoverIcon(props: CitationIconProps) {
  const { citation, index } = props;
  const { name, link } = formatCitation(citation);
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button
          variant="link"
          className="h-auto p-0 align-baseline hover:no-underline"
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            if (link) window.open(link, '_blank', 'noopener,noreferrer');
          }}
        >
          <Badge
            variant="secondary"
            className="rounded-full px-1 hover:bg-primary hover:text-primary-foreground dark:bg-[#303030] dark:hover:bg-primary"
          >
            {index + 1}
          </Badge>
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div>
          <p className="line-clamp-2 font-semibold">{citation.title}</p>
          <div className="line-clamp-4 text-sm">{citation.snippet}</div>
          <div className="mt-1 text-xs text-muted-foreground">{name}</div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
