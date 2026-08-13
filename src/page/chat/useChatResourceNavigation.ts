import { type AnchorHTMLAttributes, type MouseEvent, useCallback } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { useChatRouteParams } from '@/page/chat/ChatRouteParamsContext';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';

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
  const location = useLocation();
  const { conversationId: routeConversationId, namespaceId: routeNamespaceId } =
    useChatRouteParams();
  const namespaceId = routeNamespaceId || params.namespace_id || '';
  const copilotWorkspace = useCopilotStore(state =>
    getCopilotWorkspace(state, namespaceId)
  );
  const conversationId =
    routeConversationId ||
    (copilotWorkspace.view === 'conversation'
      ? copilotWorkspace.conversationId || ''
      : '');
  const chatRoot = namespaceId ? `/${namespaceId}/chat` : '';
  const isChatRoute =
    Boolean(chatRoot) &&
    (location.pathname === chatRoot ||
      location.pathname.startsWith(`${chatRoot}/`));
  // Prefer an in-pane preview when Copilot already owns a conversation, or when
  // Copilot is open beside a resource page (URL has no conversation_id).
  const canOpenInCopilot = Boolean(
    !params.share_id &&
    namespaceId &&
    (conversationId || (copilotWorkspace.open && !isChatRoute))
  );

  const openResource = useCallback(
    (event: MouseEvent<HTMLElement>, resourceId: string) => {
      if (!canOpenInCopilot || !isPlainClick(event)) return false;

      event.preventDefault();
      const store = useCopilotStore.getState();
      if (conversationId) {
        store.showResourceBesideConversation(
          namespaceId,
          conversationId,
          resourceId
        );
      } else {
        store.previewResource(namespaceId, resourceId);
      }
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
