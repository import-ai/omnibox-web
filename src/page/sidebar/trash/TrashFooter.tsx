import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TrashFooterProps {
  onClearAll: () => void;
  hasItems: boolean;
}

export function TrashFooter({ onClearAll, hasItems }: TrashFooterProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between pt-3 border-t">
      <span className="text-sm text-muted-foreground leading-4">
        {t('trash.auto_delete_notice')}
      </span>
      {hasItems && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 hover:text-destructive"
              onClick={onClearAll}
            >
              <Trash2 className="h-8 w-8" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('trash.clear_all')}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
