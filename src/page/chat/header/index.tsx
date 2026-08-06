import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';

import { SidebarTriggerButton } from '@/components/SidebarTriggerButton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from '@/components/ui/Breadcrumb';
import useApp from '@/hooks/useApp';
import { resetChatForNamespaceSwitch } from '@/lib/chatBridge';
import { http } from '@/lib/request';
import { setDocumentTitle } from '@/lib/utils';
import { getWizardLang } from '@/lib/wizardLang.ts';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';
import CopilotToggleButton from '@/page/copilot/CopilotToggleButton';

import Actions from './Actions';
import Title from './title';

export default function ChatHeader() {
  const app = useApp();
  const loc = useLocation();
  const params = useParams();
  const { t, i18n } = useTranslation();
  const i18nTitle = t('chat.conversations.new');
  const [chatTitle, setChatTitle] = useState(i18nTitle);
  const namespaceId = params.namespace_id || '';
  const conversationId = params.conversation_id || '';
  const routeConversationsPage = loc.pathname.endsWith('/chat/conversations');
  const routeHomePage =
    loc.pathname.endsWith('/chat') &&
    !conversationId &&
    !routeConversationsPage;
  const copilotWorkspace = useCopilotStore(state =>
    getCopilotWorkspace(state, namespaceId)
  );
  const previewingCitation = Boolean(
    conversationId && copilotWorkspace.previewResourceId
  );
  // Citation split reuses ChatHeader but content follows copilotStore (same as
  // CopilotPanel). Prefer store view so Actions match resource-detail Copilot.
  const homePage = previewingCitation
    ? copilotWorkspace.view === 'home'
    : routeHomePage;
  const conversationsPage = previewingCitation
    ? copilotWorkspace.view === 'history'
    : routeConversationsPage;
  const actionConversationId = previewingCitation
    ? copilotWorkspace.view === 'conversation'
      ? (copilotWorkspace.conversationId ?? conversationId)
      : ''
    : conversationId;
  const showCopilotHome = useCopilotStore(state => state.showHome);
  const showCopilotHistory = useCopilotStore(state => state.showHistory);

  useEffect(() => {
    return app.on('chat:title:update', (val: string) => {
      setChatTitle(val);
    });
  }, []);

  useEffect(() => {
    if (conversationId) {
      return;
    }
    setChatTitle(i18nTitle);
  }, [conversationId]);

  useEffect(() => {
    return app.on('chat:title', (text?: string) => {
      if (!text) {
        setChatTitle(i18nTitle);
        return;
      }
      // Drain cached fires from Copilot (no ChatHeader) without posting a
      // malformed /conversations/title URL when landing on chat home.
      if (!conversationId || !namespaceId) {
        return;
      }
      if (i18nTitle !== chatTitle) {
        return;
      }
      http
        .post(
          `/namespaces/${namespaceId}/conversations/${conversationId}/title`,
          {
            text,
            lang: getWizardLang(i18n),
          }
        )
        .then(res => {
          setChatTitle(res.title);
        });
    });
  }, [i18nTitle, chatTitle, conversationId, namespaceId]);

  useEffect(() => {
    if (routeConversationsPage) {
      setDocumentTitle(t('chat.conversations.history'));
    } else if (routeHomePage) {
      setDocumentTitle(t('chat.page_title'));
    } else {
      setDocumentTitle(chatTitle);
    }
  }, [chatTitle, routeConversationsPage, routeHomePage]);

  return (
    <header className="rounded-2xl sticky z-[30] top-0 bg-white flex flex-wrap min-h-12 shrink-0 items-center gap-2 dark:bg-background">
      <div className="flex flex-1 items-center gap-1 px-3 sm:gap-2">
        {previewingCitation ? (
          <CopilotToggleButton namespaceId={namespaceId} />
        ) : (
          <SidebarTriggerButton collapse />
        )}
        {conversationId && !previewingCitation && (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Title
                  data={chatTitle}
                  namespaceId={namespaceId}
                  conversationId={conversationId}
                />
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>
      <div className="ml-auto pr-3">
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
          conversationId={actionConversationId}
          conversationsPage={conversationsPage}
        />
      </div>
    </header>
  );
}
