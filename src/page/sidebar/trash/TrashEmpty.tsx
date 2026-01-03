import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function TrashEmpty() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <Trash2 className="h-8 w-8 mb-2 opacity-50" />
      <span className="text-sm">{t('trash.empty')}</span>
    </div>
  );
}
