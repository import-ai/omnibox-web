import React, { createContext, useContext } from 'react';
import type { ExtraProps } from 'react-markdown';
import { useParams } from 'react-router-dom';

import { useChatRouteParams } from '@/page/chat/ChatRouteParamsContext';
import { ChatResourceLink } from '@/page/chat/components/ChatResourceLink';
import type { Citation } from '@/page/chat/core/types/chatResponse';
import { resolveCitationTarget } from '@/page/copilot/citationTarget';
import { useShareChatOnly } from '@/page/share/ShareChatOnlyContext';

import { CitationHoverIcon } from './CitationHoverIcon';
import {
  findCitationById,
  getResourceIdFromHash,
  isCitationId,
} from './citationUtils';

const citeLinkRegex = /^#cite-(\d+)$/;
const resourceLinkRegex = /^#resource-([\w-]+)$/;

export const CitationContext = createContext<Citation[]>([]);

export function MarkdownAnchor({
  href,
  children,
  ...props
}: React.ComponentProps<'a'> & ExtraProps) {
  const citations = useContext(CitationContext);
  const params = useParams();
  const { namespaceId: routeNamespaceId } = useChatRouteParams();
  const namespaceId = routeNamespaceId || params.namespace_id || '';
  const resourceLinkPrefix = params.share_id
    ? `/s/${params.share_id}`
    : namespaceId
      ? `/${namespaceId}`
      : '';

  const chatOnly = useShareChatOnly();
  const { node } = props;
  const resourceMatch = href?.match(resourceLinkRegex);
  let resolvedResource =
    resourceMatch?.[1] ?? getResourceIdFromHash(href) ?? undefined;
  if (!resolvedResource && href && namespaceId) {
    const target = resolveCitationTarget(href, namespaceId);
    if (target.kind === 'resource') {
      resolvedResource = target.resourceId;
    }
  }
  // A chat-only share serves no resource page, so its sources stay text.
  if (resolvedResource && chatOnly) {
    return <>{children}</>;
  }
  // Citation markers are pure references: the badge only opens a card
  // naming the resource the share is meant to keep out of sight.
  if (
    chatOnly &&
    (href?.match(citeLinkRegex) ||
      findCitationById(citations, href) ||
      isCitationId(href))
  ) {
    return null;
  }
  if (resolvedResource && resourceLinkPrefix) {
    const resourceHref = `${resourceLinkPrefix}/${resolvedResource}`;
    return (
      <ChatResourceLink href={resourceHref} resourceId={resolvedResource}>
        {children}
      </ChatResourceLink>
    );
  }
  const citeMatch = href?.match(citeLinkRegex);
  if (citeMatch) {
    const id = Number(citeMatch[1]) - 1;
    const citation = citations.find(
      (item, index) => (item.index ?? index) === id
    );
    return citation ? (
      <CitationHoverIcon citation={citation} index={id} />
    ) : null;
  }
  const citationIdMatch = findCitationById(citations, href);
  if (citationIdMatch) {
    return (
      <CitationHoverIcon
        citation={citationIdMatch.citation}
        index={citationIdMatch.index}
      />
    );
  }
  if (isCitationId(href)) {
    return null;
  }
  if (
    node &&
    node.properties &&
    (!node.properties.target || node.properties.target !== 'blank')
  ) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return <a href={href}>{children}</a>;
}
