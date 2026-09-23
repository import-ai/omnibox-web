import { MessageSquareText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';

import { useResourceCommentsPanel } from './ResourceCommentsContext';

interface ResourceCommentsToggleButtonProps {
  hideWhenOpen?: boolean;
}

export function ResourceCommentsToggleButton({
  hideWhenOpen = false,
}: ResourceCommentsToggleButtonProps) {
  const { t } = useTranslation();
  const panel = useResourceCommentsPanel();
  if (!panel) {
    return null;
  }
  if (hideWhenOpen && panel.panelOpen) {
    return null;
  }
  const label = t(
    panel.panelOpen ? 'resource_comments.collapse' : 'resource_comments.title'
  );
  const tooltipLabel = t('resource_comments.tooltip');
  const toggle = () => {
    if (panel.panelOpen) {
      panel.setPanelOpen(false);
      return;
    }
    panel.setPanelOpen(true);
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          aria-label={label}
          aria-pressed={panel.panelOpen}
          onClick={toggle}
        >
          <MessageSquareText className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltipLabel}</TooltipContent>
    </Tooltip>
  );
}
