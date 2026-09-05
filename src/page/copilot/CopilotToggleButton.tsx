import { PanelRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ChatIcon } from '@/assets/icons/ChatIcon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { useResourceCommentsPanel } from '@/page/resource/comments/ResourceCommentsContext';

import { getCopilotWorkspace, useCopilotStore } from './copilotStore';

interface CopilotToggleButtonProps {
  namespaceId: string;
  hideWhenOpen?: boolean;
}

export default function CopilotToggleButton({
  namespaceId,
  hideWhenOpen = false,
}: CopilotToggleButtonProps) {
  const { t } = useTranslation();
  const open = useCopilotStore(
    state => getCopilotWorkspace(state, namespaceId).open
  );
  const toggle = useCopilotStore(state => state.toggle);
  const commentsPanel = useResourceCommentsPanel();
  const commentsOpen = !!commentsPanel?.panelOpen;
  const label = t(
    open && !hideWhenOpen && !commentsOpen
      ? 'copilot.collapse'
      : 'copilot.expand'
  );
  const handleToggle = () => {
    if (commentsOpen) {
      commentsPanel.setPanelOpen(false);
      return;
    }
    toggle(namespaceId);
  };

  const button = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          className="h-7 w-7 shrink-0"
          onClick={handleToggle}
          size="icon"
          type="button"
          variant="ghost"
        >
          {open && !hideWhenOpen && !commentsOpen ? (
            <PanelRight />
          ) : (
            <ChatIcon className="size-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  if (!hideWhenOpen) return button;

  return (
    <>
      <Separator
        orientation="vertical"
        className="mx-1 h-4 !bg-[#F2F2F2] dark:!bg-[#303132]"
      />
      {button}
    </>
  );
}
