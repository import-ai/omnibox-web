import { Delete, Undo2 } from 'lucide-react';
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
    <div className="group/trash-item relative flex items-center gap-1.5 px-3 py-1.5 hover:bg-sidebar-accent rounded-md">
      <div className="h-4 w-4 shrink-0 [&>svg]:h-4 [&>svg]:w-4">
        <ResourceIcon expand={false} resource={item} />
      </div>
      <span className="flex-1 text-sm truncate group-hover/trash-item:pr-[50px]">
        {item.name || t('untitled')}
      </span>
      <div className="absolute right-2 flex items-center gap-0.5 opacity-0 group-hover/trash-item:opacity-100 group-hover/trash-item:pointer-events-auto pointer-events-none">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-neutral-400 hover:text-foreground hover:bg-transparent"
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
              className="h-6 w-6 text-neutral-400 hover:text-destructive hover:bg-transparent"
              onClick={() => onDelete(item.id)}
            >
              <Delete className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('trash.delete_permanently')}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
