import { format, isValid, toDate } from 'date-fns';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ATTRIBUTE_STYLES } from './constants';

interface PublishedTimeAttributeProps {
  publishedAt: string;
}

export function PublishedTimeAttribute({
  publishedAt,
}: PublishedTimeAttributeProps) {
  const { t } = useTranslation();
  const parsed = toDate(publishedAt);

  if (!isValid(parsed)) {
    return null;
  }

  return (
    <div className={ATTRIBUTE_STYLES.container}>
      <div className={ATTRIBUTE_STYLES.containerLabel}>
        <Clock className={ATTRIBUTE_STYLES.icon} />
        <span className={ATTRIBUTE_STYLES.label}>
          {t('rss_folder.published_at')}
        </span>
      </div>
      <span className={ATTRIBUTE_STYLES.value}>
        {format(parsed, 'yyyy-MM-dd HH:mm:ss')}
      </span>
    </div>
  );
}
