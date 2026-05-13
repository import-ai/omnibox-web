import { Delete, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import ResourceIcon from '@/assets/icons/resourceIcon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/button';

import { TrashItem as TrashItemType } from './types';

interface TrashItemProps {
  item: TrashItemType;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TrashItemRow({ item, onRestore, onDelete }: TrashItemProps) {
  const { t } = useTranslation();

  return (
    <div className="group/trash-item relative flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:bg-sidebar-accent">
      <div className="size-4 shrink-0 [&>svg]:size-4">
        <ResourceIcon expand={false} resource={item} />
      </div>
      <span className="flex-1 truncate text-sm group-hover/trash-item:pr-[50px]">
        {item.name || t('untitled')}
      </span>
      <div className="pointer-events-none absolute right-2 flex items-center gap-0.5 opacity-0 group-hover/trash-item:pointer-events-auto group-hover/trash-item:opacity-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-neutral-400 hover:bg-transparent hover:text-foreground"
              onClick={() => onRestore(item.id)}
            >
              <Undo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('trash.restore')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-neutral-400 hover:bg-transparent hover:text-destructive"
              onClick={() => onDelete(item.id)}
            >
              <Delete className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('trash.delete_permanently')}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
