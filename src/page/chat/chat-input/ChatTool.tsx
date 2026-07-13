import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Check, FileSearch, Globe, Lightbulb, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import type { ResourceMeta } from '@/interface';
import { ToolType } from '@/page/chat/chat-input/types';

import { focusResourceDialogOnOpen } from './chatToolFocus';

const datasource = [
  {
    label: 'web_search',
    value: ToolType.WEB_SEARCH,
    Icon: Globe,
  },
  {
    label: 'reasoning',
    value: ToolType.REASONING,
    Icon: Lightbulb,
  },
];

interface IProps {
  tools: Array<ToolType>;
  renderResourcePicker?: (
    onSelect: (resource: ResourceMeta) => void
  ) => ReactNode;
  onBeforeOpen: () => void;
  onToolToggle: (tool: ToolType) => void;
  onResourceSelect: (resource: ResourceMeta) => void;
}

export default function ChatTool(props: IProps) {
  const {
    tools,
    renderResourcePicker,
    onBeforeOpen,
    onToolToggle,
    onResourceSelect,
  } = props;
  const { t } = useTranslation();
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const resourceDialogRef = useRef<HTMLDivElement>(null);
  const resourceDialogOpenedByPointerRef = useRef(false);

  return (
    <>
      <DropdownMenu>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                aria-label={t('chat.tools.more')}
                onPointerDown={onBeforeOpen}
              >
                <Plus />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{t('chat.tools.more')}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="top" align="start" className="w-52 p-1">
          <div className="px-2 py-1 text-xs text-muted-foreground">
            {t('chat.tools.add')}
          </div>
          {renderResourcePicker && (
            <DropdownMenuItem
              className="cursor-pointer gap-2 rounded-lg px-2 py-2"
              onPointerDown={() => {
                resourceDialogOpenedByPointerRef.current = true;
              }}
              onKeyDown={() => {
                resourceDialogOpenedByPointerRef.current = false;
              }}
              onClick={() => setResourceDialogOpen(true)}
            >
              <FileSearch className="size-4 text-muted-foreground" />
              <span className="flex-1">{t('chat.tools.select_resource')}</span>
            </DropdownMenuItem>
          )}
          {datasource.map(({ label, value, Icon }) => (
            <DropdownMenuItem
              key={value}
              className="cursor-pointer gap-2 rounded-lg px-2 py-2"
              onClick={() => onToolToggle(value)}
            >
              <Icon className="size-4 text-muted-foreground" />
              <span className="flex-1">{t('chat.tools.' + label)}</span>
              {tools.includes(value) && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {renderResourcePicker && (
        <Dialog
          open={resourceDialogOpen}
          onOpenChange={open => {
            setResourceDialogOpen(open);
            if (!open) resourceDialogOpenedByPointerRef.current = false;
          }}
        >
          <DialogContent
            ref={resourceDialogRef}
            tabIndex={-1}
            onOpenAutoFocus={event => {
              focusResourceDialogOnOpen(
                event,
                resourceDialogRef.current,
                resourceDialogOpenedByPointerRef.current
              );
              resourceDialogOpenedByPointerRef.current = false;
            }}
            className="w-[480px] max-w-[90%] gap-2 overflow-hidden bg-popover px-4 pb-5 pt-8 outline-none dark:bg-neutral-900"
          >
            <DialogHeader>
              <VisuallyHidden>
                <DialogTitle>{t('chat.tools.select_resource')}</DialogTitle>
                <DialogDescription>
                  {t('chat.tools.select_resource')}
                </DialogDescription>
              </VisuallyHidden>
            </DialogHeader>
            {renderResourcePicker(resource => {
              onResourceSelect(resource);
              setResourceDialogOpen(false);
            })}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
