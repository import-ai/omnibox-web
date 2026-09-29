import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';

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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={onClearAll}
            >
              <Trash2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('trash.clear_all')}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
