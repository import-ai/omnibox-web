import Title, { ITitleProps } from './title';
import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BreadcrumbPage } from '@/components/ui/breadcrumb';

export default function ChatHeaderTitle(props: ITitleProps) {
  const { namespaceId, conversationId } = props;
  const app = useApp();
  const { t } = useTranslation();
  const i18nTitle = t('chat.conversations.new');
  const [data, onData] = useState(i18nTitle);

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
  }, [data, namespaceId, conversationId]);

  return (
    <BreadcrumbPage className="line-clamp-1">
      <Title {...props} data={data} editable />
    </BreadcrumbPage>
  );
}
