import { Trash } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function TrashEmpty() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <Trash className="size-6 mb-2 opacity-50" />
      <span className="text-sm opacity-50">{t('trash.empty')}</span>
    </div>
  );
}
