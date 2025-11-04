import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from '@/components/ui/breadcrumb';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import { getWizardLang } from '@/lib/wizard-lang.ts';

import Actions from './actions';
import Title from './title';

export default function ChatHeader() {
  const app = useApp();
  const loc = useLocation();
  const params = useParams();
  const { open, isMobile } = useSidebar();
  const { t, i18n } = useTranslation();
  const i18nTitle = t('chat.conversations.new');
  const [chatTitle, setChatTitle] = useState(i18nTitle);
  const namespaceId = params.namespace_id || '';
  const conversationId = params.conversation_id || '';
  const conversationsPage = loc.pathname.endsWith('/chat/conversations');
  const homePage =
    loc.pathname.endsWith('/chat') && !conversationId && !conversationsPage;

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
    if (conversationsPage) {
      document.title = t('chat.conversations.history');
    } else if (homePage) {
      document.title = t('chat.page_title');
    } else {
      document.title = chatTitle;
    }
  }, [chatTitle, conversationsPage, homePage]);

  return (
    <header className="rounded-[16px] sticky z-[30] top-0 bg-white flex flex-wrap min-h-12 shrink-0 items-center gap-2 dark:bg-background">
      <div className="flex flex-1 items-center gap-1 px-3 sm:gap-2">
        {(!open || isMobile) && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className="text-[#8F959E]" />
              </TooltipTrigger>
              <TooltipContent>{t('sidebar.expand')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {conversationId && (
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
          homePage={homePage}
          chatTitle={chatTitle}
          namespaceId={namespaceId}
          conversationId={conversationId}
          conversationsPage={conversationsPage}
        />
      </div>
    </header>
  );
}
