import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/button';

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
    <div className="flex items-center justify-between border-t pt-3">
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
              className="size-4 hover:text-destructive"
              onClick={onClearAll}
            >
              <Trash2 className="size-8" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('trash.clear_all')}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
