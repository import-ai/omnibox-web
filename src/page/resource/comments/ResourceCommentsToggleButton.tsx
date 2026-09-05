import { MessageSquareText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';

import { useResourceCommentsPanel } from './ResourceCommentsContext';

export function ResourceCommentsToggleButton() {
  const { t } = useTranslation();
  const panel = useResourceCommentsPanel();
  if (!panel) {
    return null;
  }
  const label = t(
    panel.panelOpen ? 'resource_comments.collapse' : 'resource_comments.title'
  );
  const toggle = () => panel.setPanelOpen(!panel.panelOpen);
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
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
