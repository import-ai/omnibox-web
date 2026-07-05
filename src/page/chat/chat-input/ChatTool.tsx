import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Check, FileSearch, Globe, Lightbulb, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
import MoveToForm from '@/page/resource/actions/move/MoveToForm';

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
  namespaceId?: string;
  onBeforeOpen: () => void;
  onToolToggle: (tool: ToolType) => void;
  onResourceSelect: (resource: ResourceMeta) => void;
}

export default function ChatTool(props: IProps) {
  const { tools, namespaceId, onBeforeOpen, onToolToggle, onResourceSelect } =
    props;
  const { t } = useTranslation();
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu
        onOpenChange={open => {
          if (open) onBeforeOpen();
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 rounded-full text-muted-foreground hover:text-foreground"
            aria-label={t('chat.tools.add')}
            onPointerDown={onBeforeOpen}
          >
            <Plus />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-52 p-1">
          <div className="px-2 py-1 text-xs text-muted-foreground">
            {t('chat.tools.add')}
          </div>
          {namespaceId && (
            <DropdownMenuItem
              className="cursor-pointer gap-2 rounded-lg px-2 py-2"
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
      {namespaceId && (
        <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
          <DialogContent className="w-[480px] max-w-[90%] overflow-hidden bg-popover px-4 pb-5 pt-6 dark:bg-neutral-900">
            <DialogHeader>
              <VisuallyHidden>
                <DialogTitle>{t('chat.tools.select_resource')}</DialogTitle>
                <DialogDescription>
                  {t('chat.tools.select_resource')}
                </DialogDescription>
              </VisuallyHidden>
            </DialogHeader>
            <MoveToForm
              resourceIds={[]}
              namespaceId={namespaceId}
              showDisabledTargets
              onFinished={(_, __, targetName, resource) => {
                if (!resource) return;
                onResourceSelect({
                  ...resource,
                  name: resource.name || targetName,
                });
                setResourceDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
