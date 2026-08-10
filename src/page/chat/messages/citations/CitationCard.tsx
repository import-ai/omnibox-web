import { useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { useChatRouteParams } from '@/page/chat/ChatRouteParamsContext';
import { ChatResourceLink } from '@/page/chat/components/ChatResourceLink';
import { type CitationIconProps } from '@/page/chat/messages/citations/CitationHoverIcon';
import { resolveCitationTarget } from '@/page/copilot/citationTarget';

import { extractDomain } from './utils';

interface CitationCardProps extends CitationIconProps {
  onOpenResource?: () => void;
}

export function CitationCard(props: CitationCardProps) {
  const { citation, index } = props;
  const params = useParams();
  const { namespaceId } = useChatRouteParams();
  const target = resolveCitationTarget(citation.link, namespaceId);
  const resourcePrefix = params.share_id
    ? `/s/${params.share_id}`
    : namespaceId
      ? `/${namespaceId}`
      : '..';
  const className =
    'block p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-600';
  const content = (
    <>
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
    </>
  );

  return (
    <div className="p-2">
      {target.kind === 'resource' ? (
        <ChatResourceLink
          className={className}
          href={`${resourcePrefix}/${target.resourceId}`}
          onOpened={props.onOpenResource}
          resourceId={target.resourceId}
        >
          {content}
        </ChatResourceLink>
      ) : target.kind === 'external' ? (
        <a
          className={className}
          href={
            citation.link.startsWith('http')
              ? citation.link
              : '../' + citation.link
          }
          rel="noopener noreferrer"
          target="_blank"
        >
          {content}
        </a>
      ) : (
        <div className={className}>{content}</div>
      )}
    </div>
  );
}
