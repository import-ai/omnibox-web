import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Citation } from '@/page/chat/types/chat-response';
import { formatCitation } from '@/page/chat/messages/citations/utils.tsx';

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
          className="px-0 py-0 h-auto align-baseline hover:no-underline"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (link) window.open(link, '_blank', 'noopener,noreferrer');
          }}
        >
          <Badge
            variant="secondary"
            className="rounded-full px-1 hover:text-primary-foreground hover:bg-primary hover:dark:bg-primary dark:bg-[#303030]"
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
