import { type AnchorHTMLAttributes, type MouseEvent, useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { useChatRouteParams } from '@/page/chat/ChatRouteParamsContext';
import { useCopilotStore } from '@/page/copilot/copilotStore';

type ResourceLinkProps = Pick<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'onClick' | 'rel' | 'target'
>;

function isPlainClick(event: MouseEvent<HTMLElement>) {
  return (
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  );
}

/** Opens authenticated chat resources beside the active Copilot conversation. */
export function useChatResourceNavigation() {
  const params = useParams();
  const { conversationId, namespaceId } = useChatRouteParams();
  const canOpenInCopilot = Boolean(
    !params.share_id && namespaceId && conversationId
  );

  const openResource = useCallback(
    (event: MouseEvent<HTMLElement>, resourceId: string) => {
      if (!canOpenInCopilot || !isPlainClick(event)) return false;

      event.preventDefault();
      useCopilotStore
        .getState()
        .showResourceBesideConversation(
          namespaceId,
          conversationId,
          resourceId
        );
      return true;
    },
    [canOpenInCopilot, conversationId, namespaceId]
  );

  const getResourceLinkProps = useCallback(
    (resourceId: string, onOpened?: () => void): ResourceLinkProps => ({
      onClick: event => {
        if (openResource(event, resourceId)) onOpened?.();
      },
      rel: 'noopener noreferrer',
      target: canOpenInCopilot ? undefined : '_blank',
    }),
    [canOpenInCopilot, openResource]
  );

  return { canOpenInCopilot, getResourceLinkProps, openResource };
}
