import { type CitationIconProps } from '@/page/chat/messages/citations/citation-hover-icon';
import { Badge } from '@/components/ui/badge';

export function CitationCard(props: CitationIconProps) {
  const { citation, index } = props;

  return (
    <div className="p-2">
      <a
        target="_blank"
        rel="noopener noreferrer"
        className="block p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-600"
        href={
          citation.link.startsWith('http')
            ? citation.link
            : '../' + citation.link
        }
      >
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-foreground leading-tight">
            {citation.title}
          </h2>
          <Badge
            variant="secondary"
            className="rounded-full p-0 min-w-[20px] text-gray-400 justify-center items-center dark:bg-gray-600 dark:text-gray-100"
          >
            {index + 1}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {citation.snippet}
        </p>
      </a>
    </div>
  );
}
