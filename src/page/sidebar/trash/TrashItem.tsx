import parse, { domToReact } from 'html-react-parser';
import { File, Folder, Trash, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { themeIcons } from 'seti-icons';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { TrashItem as TrashItemType } from './types';

interface TrashItemProps {
  item: TrashItemType;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

function getIconByFilename(filename: string) {
  const getIcon = themeIcons({
    blue: '#519aba',
    grey: '#4d5a5e',
    'grey-light': '#6d8086',
    green: '#8dc149',
    orange: '#e37933',
    pink: '#f55385',
    purple: '#a074c4',
    red: '#cc3e44',
    white: '#d4d7d6',
    yellow: '#cbcb41',
    ignore: '#41535b',
  });
  const { svg, color } = getIcon(filename);

  if (svg) {
    return parse(svg, {
      replace(domNode: any) {
        if (domNode.type === 'tag' && domNode.name === 'svg') {
          return (
            <svg
              width="16"
              height="16"
              fill={color}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
              {...domNode.attribs}
            >
              {domToReact(domNode.children)}
            </svg>
          );
        }
      },
    });
  }
  return <File className="h-4 w-4 shrink-0" />;
}

function getResourceIcon(item: TrashItemType) {
  if (item.resource_type === 'folder') {
    return <Folder className="h-4 w-4 shrink-0" />;
  }

  if (item.resource_type === 'file' && item.attrs?.original_name) {
    return getIconByFilename(item.attrs.original_name);
  }

  return <File className="h-4 w-4 shrink-0" />;
}

export function TrashItemRow({ item, onRestore, onDelete }: TrashItemProps) {
  const { t } = useTranslation();

  return (
    <div className="group flex items-center gap-0.5 px-3 py-1 hover:bg-muted rounded-md">
      {getResourceIcon(item)}
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
