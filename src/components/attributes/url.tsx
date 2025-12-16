import { Link } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ATTRIBUTE_STYLES } from './constants';

interface UrlAttributeProps {
  url: string;
}

export function UrlAttribute({ url }: UrlAttributeProps) {
  const { t } = useTranslation();

  return (
    <div className={ATTRIBUTE_STYLES.containerStart}>
      <div className={ATTRIBUTE_STYLES.containerLabel}>
        <Link className={`shrink-0 ${ATTRIBUTE_STYLES.icon}`} />
        <span className={ATTRIBUTE_STYLES.label}>
          {t('resource.attrs.url')}
        </span>
      </div>
      <a
        target="_blank"
        href={url}
        className={`max-w-[200px] sm:max-w-full break-all ${ATTRIBUTE_STYLES.value} truncate`}
      >
        {url}
      </a>
    </div>
  );
}
