import { Trash, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import ResourceIcon from '@/page/sidebar/content/resourceIcon';

import { TrashItem as TrashItemType } from './types';

interface TrashItemProps {
  item: TrashItemType;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TrashItemRow({ item, onRestore, onDelete }: TrashItemProps) {
  const { t } = useTranslation();

  return (
    <div className="group flex items-center gap-0.5 px-3 py-1 hover:bg-muted rounded-md">
      <div className="h-4 w-4 shrink-0 [&>svg]:h-4 [&>svg]:w-4">
        <ResourceIcon expand={false} resource={item} />
      </div>
      <span className="flex-1 text-sm truncate">
        {item.name || t('untitled')}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-neutral-400 hover:text-foreground"
              onClick={() => onRestore(item.id)}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('trash.restore')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-neutral-400 hover:text-destructive"
              onClick={() => onDelete(item.id)}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('trash.delete_permanently')}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
