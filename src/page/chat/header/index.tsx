import Title from './title';
import Actions from './actions';
import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import { useTranslation } from 'react-i18next';
import { useRef, useState, useEffect } from 'react';
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
  const modified = useRef(false);
  const { t } = useTranslation();
  const i18nTitle = t('chat.conversations.new');
  const [data, onData] = useState(i18nTitle);
  const namespaceId = params.namespace_id || '';
  const conversationId = params.conversation_id || '';
  const conversationsPage = loc.pathname.endsWith('/chat/conversations');

  useEffect(() => {
    return app.on('chat:title:update', (val: string) => {
      if (!modified.current) {
        modified.current = true;
      }
      onData(val);
    });
  }, []);

  useEffect(() => {
    if (conversationId) {
      return;
    }
    onData(i18nTitle);
  }, [conversationId]);

  useEffect(() => {
    return app.on('chat:title', (text?: string) => {
      if (!text) {
        if (modified.current) {
          modified.current = false;
        }
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
          if (!modified.current) {
            modified.current = true;
          }
          onData(res.title);
        });
    });
  }, [data, conversationId, namespaceId]);

  useEffect(() => {
    if (modified.current) {
      return;
    }
    onData(i18nTitle);
  }, [i18nTitle]);

  return (
    <header className="sticky top-0 bg-white flex h-14 shrink-0 items-center gap-2 dark:bg-background">
      <div className="flex flex-1 items-center gap-1 px-3 sm:gap-2">
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
      <div className="ml-auto pr-3">
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
