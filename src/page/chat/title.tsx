import { useTranslation } from 'react-i18next';
import { BreadcrumbPage } from '@/components/ui/breadcrumb';
import { useState } from 'react';

export default function ChatHeaderTitle() {
  const { t } = useTranslation();
  const [data] = useState(t('chat.new_conversation'));

  return <BreadcrumbPage className="line-clamp-1">{data}</BreadcrumbPage>;
}
