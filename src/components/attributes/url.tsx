import { Link } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ATTRIBUTE_STYLES } from './constants';

interface UrlAttributeProps {
  url: string;
}

export function UrlAttribute({ url }: UrlAttributeProps) {
  const { t } = useTranslation();

  return (
    <div className="grid min-w-0 grid-cols-[auto,minmax(0,1fr)] items-start gap-4">
      <div className={ATTRIBUTE_STYLES.containerLabel}>
        <Link className={`shrink-0 ${ATTRIBUTE_STYLES.icon}`} />
        <span className={ATTRIBUTE_STYLES.label}>
          {t('resource.attrs.url')}
        </span>
      </div>
      <a
        target="_blank"
        href={url}
        className={`block min-w-0 w-full max-w-full truncate ${ATTRIBUTE_STYLES.value} hover:underline`}
      >
        {url}
      </a>
    </div>
  );
}
