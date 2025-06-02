import { type CitationIconProps } from '@/page/chat/messages/citations/citation-hover-icon';
import { Badge } from '@/components/ui/badge';

export function CitationCard(props: CitationIconProps) {
  const { citation, index } = props;

  return (
    <>
      <div className="my-2 w-full max-w-sm">
        <h3 className="text-sm font-semibold hover:text-blue-500">
          <a
            href={
              citation.link.startsWith('http')
                ? citation.link
                : '../' + citation.link
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            {citation.title}
          </a>
        </h3>
        <p className="text-muted-foreground text-xs line-clamp-4">
          {citation.snippet}
        </p>
        <Badge variant="secondary" className="rounded-full px-1">
          {index + 1}
        </Badge>
      </div>
    </>
  );
}
