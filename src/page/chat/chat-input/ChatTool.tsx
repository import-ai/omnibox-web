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
import type { ResourceMeta } from '@/interface';
import { IResTypeContext, ToolType } from '@/page/chat/chat-input/types';
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
  context: IResTypeContext[];
  namespaceId: string;
  onBeforeOpen: () => void;
  onToolToggle: (tool: ToolType) => void;
  onResourceSelect: (resource: ResourceMeta) => void;
}

export default function ChatTool(props: IProps) {
  const {
    tools,
    context,
    namespaceId,
    onBeforeOpen,
    onToolToggle,
    onResourceSelect,
  } = props;
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);

  return (
    <>
      <div className="relative">
        <Button
          size="icon"
          variant="ghost"
          className="size-8 rounded-full text-muted-foreground hover:text-foreground"
          aria-label={t('chat.tools.add')}
          onMouseDown={event => {
            event.preventDefault();
            onBeforeOpen();
          }}
          onClick={() => {
            setMenuOpen(open => !open);
          }}
        >
          <Plus />
        </Button>
        {menuOpen && (
          <div className="absolute bottom-full left-0 z-50 mb-2 min-w-52 rounded-xl border bg-popover p-1 text-popover-foreground shadow-md dark:bg-neutral-800">
            <div className="px-2 py-1 text-xs text-muted-foreground">
              {t('chat.tools.add')}
            </div>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent"
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                setMenuOpen(false);
                setResourceDialogOpen(true);
              }}
            >
              <FileSearch className="size-4 text-muted-foreground" />
              <span className="flex-1">{t('chat.tools.select_resource')}</span>
              {context.length > 0 && <Check className="size-4" />}
            </button>
            {datasource.map(({ label, value, Icon }) => (
              <button
                type="button"
                key={value}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={event => event.preventDefault()}
                onClick={() => {
                  setMenuOpen(false);
                  onToolToggle(value);
                }}
              >
                <Icon className="size-4 text-muted-foreground" />
                <span className="flex-1">{t('chat.tools.' + label)}</span>
                {tools.includes(value) && <Check className="size-4" />}
              </button>
            ))}
          </div>
        )}
      </div>
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
    </>
  );
}
