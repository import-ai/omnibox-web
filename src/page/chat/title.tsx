import { useTranslation } from 'react-i18next';
import { BreadcrumbPage } from '@/components/ui/breadcrumb';

export default function ChatHeaderTitle() {
  const { t } = useTranslation();

  return <BreadcrumbPage className="line-clamp-1">{t('chat')}</BreadcrumbPage>;
}
