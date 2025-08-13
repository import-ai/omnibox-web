import { Badge } from '@/components/ui/badge';
import { type CitationIconProps } from '@/page/chat/messages/citations/citation-hover-icon';

import { extractDomain } from './utils';

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
        <h2 className="font-semibold text-foreground leading-tight">
          {citation.title}
        </h2>
        <p className="text-sm text-muted-foreground my-1 line-clamp-2">
          {citation.snippet}
        </p>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {extractDomain(citation.link)}
          </span>
          <Badge
            variant="secondary"
            className="rounded-full p-0 min-w-[20px] text-gray-400 justify-center items-center dark:bg-gray-600 dark:text-gray-100"
          >
            {index + 1}
          </Badge>
        </div>
      </a>
    </div>
  );
}
