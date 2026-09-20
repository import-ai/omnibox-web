import { PanelRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ChatIcon } from '@/assets/icons/ChatIcon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';
import { useResourceCommentsPanel } from '@/page/resource/comments/ResourceCommentsContext';

import { getCopilotWorkspace, useCopilotStore } from './copilotStore';

interface CopilotToggleButtonProps {
  namespaceId: string;
  collapseOnly?: boolean;
}

export default function CopilotToggleButton({
  namespaceId,
  collapseOnly = false,
}: CopilotToggleButtonProps) {
  const { t } = useTranslation();
  const workspace = useCopilotStore(state =>
    getCopilotWorkspace(state, namespaceId)
  );
  const close = useCopilotStore(state => state.close);
  const showHome = useCopilotStore(state => state.showHome);
  const commentsPanel = useResourceCommentsPanel();
  const commentsOpen = !!commentsPanel?.panelOpen;
  const copilotActive =
    workspace.open && !commentsOpen && workspace.view !== 'resource_history';
  const label = t(
    collapseOnly || copilotActive ? 'right_sidebar.collapse' : 'copilot.expand'
  );
  const tooltipLabel =
    collapseOnly || copilotActive ? label : t('copilot.tooltip');
  const handleToggle = () => {
    if (collapseOnly || copilotActive) {
      close(namespaceId);
      return;
    }
    if (commentsOpen) {
      commentsPanel?.setPanelOpen(false);
    }
    showHome(namespaceId);
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
          {collapseOnly || copilotActive ? (
            <PanelRight />
          ) : (
            <ChatIcon className="size-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltipLabel}</TooltipContent>
    </Tooltip>
  );
  return button;
}
