import { useTranslation } from 'react-i18next';
import { BreadcrumbPage } from '@/components/ui/breadcrumb';
import { useMemo, useState } from 'react';

export default function ChatHeaderTitle() {
  const { t } = useTranslation();
  const [data] = useState<string>();
  const i18nTitle = t('chat.conversations.new');

  const chatHeaderTitle = useMemo<string>(() => {
    return data || i18nTitle;
  }, [data, i18nTitle]);

  return (
    <BreadcrumbPage className="line-clamp-1">{chatHeaderTitle}</BreadcrumbPage>
  );
}
