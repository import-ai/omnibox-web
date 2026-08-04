import { PanelLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';

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
  const label = t(open ? 'copilot.collapse' : 'copilot.expand');

  if (open && hideWhenOpen) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          className="size-7"
          onClick={() => toggle(namespaceId)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <PanelLeft />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
