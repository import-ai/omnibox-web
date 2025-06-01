import { type Citation } from '@/page/chat/types/chat-response.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';

export interface CitationIconProps {
  index: number;
  citation: Citation;
}

export function CitationIcon(props: CitationIconProps) {
  const { index, citation } = props;

  return (
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
  );
}
