import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card.tsx';
import {
  CitationIcon,
  CitationIconProps,
} from '@/page/chat/messages/citations/citation-icon.tsx';

export function CitationHoverIcon(props: CitationIconProps) {
  const { citation, index } = props;
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <CitationIcon citation={citation} index={index} />
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
