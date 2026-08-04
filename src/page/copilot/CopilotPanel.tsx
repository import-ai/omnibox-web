import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { History, PanelLeft } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/Sheet';
import { useIsMobile } from '@/hooks/useMobile';
import { resetChatForNamespaceSwitch } from '@/lib/chatBridge';
import { cn } from '@/lib/utils';
import { PlusIcon } from '@/page/chat/header/PlusIcon';

import { getCopilotWorkspace, useCopilotStore } from './copilotStore';
import CopilotView from './CopilotView';

interface CopilotPanelProps {
  namespaceId: string;
}

function IconAction(props: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={props.label}
          className={props.className ?? 'size-7'}
          onClick={props.onClick}
          size="icon"
          type="button"
          variant="ghost"
        >
          {props.children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{props.label}</TooltipContent>
    </Tooltip>
  );
}

function CopilotPanelContent({ namespaceId }: CopilotPanelProps) {
  const { t } = useTranslation();
  const close = useCopilotStore(state => state.close);
  const showHome = useCopilotStore(state => state.showHome);
  const showHistory = useCopilotStore(state => state.showHistory);

  const startNewChat = () => {
    resetChatForNamespaceSwitch(namespaceId);
    showHome(namespaceId);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-background md:w-[380px] md:min-w-[380px]">
      <header className="flex h-12 shrink-0 items-center px-3">
        <IconAction
          className="size-7 text-neutral-400 hover:bg-[#E6E6EC] hover:text-neutral-400 dark:hover:bg-accent"
          label={t('copilot.collapse')}
          onClick={() => close(namespaceId)}
        >
          <PanelLeft />
        </IconAction>
        <div className="ml-auto flex items-center gap-1">
          <IconAction
            label={t('chat.conversations.new_chat')}
            onClick={startNewChat}
          >
            <PlusIcon />
          </IconAction>
          <IconAction
            className="size-7 text-[#585D65] dark:text-white"
            label={t('chat.conversations.history')}
            onClick={() => showHistory(namespaceId)}
          >
            <History />
          </IconAction>
        </div>
      </header>
      <Separator />
      <div className="flex min-h-0 flex-1 flex-col">
        <CopilotView namespaceId={namespaceId} />
      </div>
    </div>
  );
}

export default function CopilotPanel({ namespaceId }: CopilotPanelProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const open = useCopilotStore(
    state => getCopilotWorkspace(state, namespaceId).open
  );
  const close = useCopilotStore(state => state.close);
  const [ready, setReady] = useState(false);
  const setPanelElement = useCallback(
    (element: HTMLElement | null) => {
      element?.toggleAttribute('inert', !open);
    },
    [open]
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={value => !value && close(namespaceId)}>
        <SheetContent
          className="w-full max-w-none p-0 [&>button]:hidden"
          side="right"
        >
          <VisuallyHidden>
            <SheetTitle>{t('copilot.title')}</SheetTitle>
            <SheetDescription>{t('copilot.description')}</SheetDescription>
          </VisuallyHidden>
          <CopilotPanelContent namespaceId={namespaceId} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      aria-hidden={!open}
      aria-label={t('copilot.title')}
      className={cn(
        'my-2 flex shrink-0 overflow-hidden rounded-2xl border bg-white motion-safe:transition-[width,margin-right,border-color] motion-safe:duration-200 motion-safe:ease-linear dark:bg-background',
        ready && open
          ? 'mr-2 w-[380px] border-border'
          : 'pointer-events-none mr-0 w-0 border-transparent'
      )}
      ref={setPanelElement}
    >
      <CopilotPanelContent namespaceId={namespaceId} />
    </aside>
  );
}
