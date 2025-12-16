import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ATTRIBUTE_STYLES } from './constants';

interface CreatedTimeAttributeProps {
  createdAt: string;
}

export function CreatedTimeAttribute({ createdAt }: CreatedTimeAttributeProps) {
  const { t } = useTranslation();

  return (
    <div className={ATTRIBUTE_STYLES.container}>
      <div className={ATTRIBUTE_STYLES.containerLabel}>
        <Clock className={ATTRIBUTE_STYLES.icon} />
        <span className={ATTRIBUTE_STYLES.label}>
          {t('resource.attrs.created')}
        </span>
      </div>
      <span className={ATTRIBUTE_STYLES.value}>
        {format(createdAt, 'yyyy-MM-dd HH:mm:ss')}
      </span>
    </div>
  );
}
