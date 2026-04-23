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
        className="block rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-600"
        href={
          citation.link.startsWith('http')
            ? citation.link
            : '../' + citation.link
        }
      >
        <h2 className="font-semibold leading-tight text-foreground">
          {citation.title}
        </h2>
        <p className="my-1 line-clamp-2 text-sm text-muted-foreground">
          {citation.snippet}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {extractDomain(citation.link)}
          </span>
          <Badge
            variant="secondary"
            className="min-w-[20px] items-center justify-center rounded-full p-0 text-gray-400 dark:bg-gray-600 dark:text-gray-100"
          >
            {index + 1}
          </Badge>
        </div>
      </a>
    </div>
  );
}
