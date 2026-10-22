import { useTranslation } from 'react-i18next';

import { TrashEmptyIcon } from '@/assets/icons/TrashEmptyIcon';

export function TrashEmpty() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <TrashEmptyIcon className="mb-2 size-6 opacity-50" />
      <span className="text-sm opacity-50">{t('trash.empty')}</span>
    </div>
  );
}
