import { CitationIconProps } from '@/page/chat/messages/citations/citation-icon';
import { Badge } from '@/components/ui/badge';

export function CitationCard(props: CitationIconProps) {
  const { citation, index } = props;

  return (
    <>
      <a
        href={
          citation.link.startsWith('http')
            ? citation.link
            : '../' + citation.link
        }
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="my-2 w-full max-w-sm hover:bg-secondary">
          <h3 className="text-sm font-semibold">{citation.title}</h3>
          <p className="text-muted-foreground text-xs line-clamp-4">
            {citation.snippet}
          </p>
          <Badge
            variant="secondary"
            className="rounded-full px-1 hover:text-primary-foreground hover:bg-primary"
          >
            {index + 1}
          </Badge>
        </div>
      </a>
    </>
  );
}
