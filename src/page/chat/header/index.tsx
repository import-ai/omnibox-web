import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';

import { SidebarTriggerButton } from '@/components/SidebarTriggerButton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from '@/components/ui/Breadcrumb';
import { resetChatForNamespaceSwitch } from '@/lib/chatBridge';
import { setDocumentTitle } from '@/lib/utils';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';
import CopilotToggleButton from '@/page/copilot/CopilotToggleButton';

import Actions from './Actions';
import Title from './title';
import { useChatTitle } from './useChatTitle';

export default function ChatHeader() {
  const loc = useLocation();
  const params = useParams();
  const { t } = useTranslation();
  const namespaceId = params.namespace_id || '';
  const routeConversationId = params.conversation_id || '';
  const routeConversationsPage = loc.pathname.endsWith('/chat/conversations');
  const routeHomePage =
    loc.pathname.endsWith('/chat') &&
    !routeConversationId &&
    !routeConversationsPage;
  const copilotWorkspace = useCopilotStore(state =>
    getCopilotWorkspace(state, namespaceId)
  );
  const previewingCitation = Boolean(
    routeConversationId && copilotWorkspace.previewResourceId
  );
  // Citation split reuses ChatHeader but content follows copilotStore (same as
  // CopilotPanel). Prefer store view so Actions match resource-detail Copilot.
  const homePage = previewingCitation
    ? copilotWorkspace.view === 'home'
    : routeHomePage;
  const conversationsPage = previewingCitation
    ? copilotWorkspace.view === 'history'
    : routeConversationsPage;
  const titleConversationId = previewingCitation
    ? copilotWorkspace.view === 'conversation'
      ? (copilotWorkspace.conversationId ?? routeConversationId)
      : ''
    : routeConversationId;
  const showCopilotHome = useCopilotStore(state => state.showHome);
  const showCopilotHistory = useCopilotStore(state => state.showHistory);
  const { chatTitle } = useChatTitle(namespaceId, titleConversationId);

  useEffect(() => {
    if (routeConversationsPage) {
      setDocumentTitle(t('chat.conversations.history'));
    } else if (routeHomePage) {
      setDocumentTitle(t('chat.page_title'));
    } else {
      setDocumentTitle(chatTitle);
    }
  }, [chatTitle, routeConversationsPage, routeHomePage, t]);

  return (
    <header className="rounded-2xl sticky z-[30] top-0 bg-white flex flex-wrap min-h-12 shrink-0 items-center gap-2 dark:bg-background">
      <div className="flex min-w-0 flex-1 items-center gap-1 px-3 sm:gap-2">
        {previewingCitation ? (
          <CopilotToggleButton namespaceId={namespaceId} />
        ) : (
          <SidebarTriggerButton collapse />
        )}
        {titleConversationId && (
          <Breadcrumb className="min-w-0">
            <BreadcrumbList>
              <BreadcrumbItem className="min-w-0">
                <Title
                  data={chatTitle}
                  namespaceId={namespaceId}
                  conversationId={titleConversationId}
                />
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>
      <div className="ml-auto shrink-0 pr-3">
        <Actions
          compact={previewingCitation}
          homePage={homePage}
          chatTitle={chatTitle}
          namespaceId={namespaceId}
          onChatCreate={
            previewingCitation
              ? () => {
                  resetChatForNamespaceSwitch(namespaceId);
                  showCopilotHome(namespaceId);
                }
              : undefined
          }
          onChatHistory={
            previewingCitation
              ? () => showCopilotHistory(namespaceId)
              : undefined
          }
          conversationId={titleConversationId}
          conversationsPage={conversationsPage}
        />
      </div>
    </header>
  );
}
