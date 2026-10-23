import { Trash } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/omnibox/IconButton';

interface TrashFooterProps {
  onClearAll: () => void;
  hasItems: boolean;
  trashRetentionDays: number | null;
}

export function TrashFooter({
  onClearAll,
  hasItems,
  trashRetentionDays,
}: TrashFooterProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-2 border-t pt-3">
      {trashRetentionDays !== null && (
        <span className="text-sm leading-4 text-muted-foreground">
          {t('trash.auto_delete_notice', {
            days: trashRetentionDays,
          })}
        </span>
      )}
      {hasItems && (
        <IconButton
          size="sm"
          tone="sidebar"
          destructive
          label={t('trash.clear_all')}
          onClick={onClearAll}
        >
          <Trash className="size-4" />
        </IconButton>
      )}
    </div>
  );
}
