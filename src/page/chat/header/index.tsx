import Title from './title';
import Actions from './actions';
import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from '@/components/ui/breadcrumb';

export default function ChatHeader() {
  const app = useApp();
  const loc = useLocation();
  const params = useParams();
  const { t } = useTranslation();
  const i18nTitle = t('chat.conversations.new');
  const [data, onData] = useState(i18nTitle);
  const namespaceId = params.namespace_id || '';
  const conversationId = params.conversation_id || '';
  const conversationsPage = loc.pathname.endsWith('/chat/conversations');

  useEffect(() => {
    return app.on('chat:title', (text?: string) => {
      if (!text) {
        onData(i18nTitle);
        return;
      }
      if (i18nTitle !== data) {
        return;
      }
      http
        .post(
          `/namespaces/${namespaceId}/conversations/${conversationId}/title`,
          {
            text,
          },
        )
        .then((res) => {
          onData(res.title);
        });
    });
  }, [data, conversationId, namespaceId]);

  return (
    <header className="sticky top-0 bg-white flex h-14 shrink-0 items-center gap-2 dark:bg-background">
      <div className="flex flex-1 items-center gap-2 px-3">
        <SidebarTrigger />
        {!conversationsPage && (
          <>
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <Title
                    data={data}
                    namespaceId={namespaceId}
                    conversationId={conversationId}
                  />
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </>
        )}
      </div>
      <div className="ml-auto px-3">
        <Actions
          data={data}
          namespaceId={namespaceId}
          conversationId={conversationId}
          conversationsPage={conversationsPage}
        />
      </div>
    </header>
  );
}
