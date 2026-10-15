import { MessageSquareText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/omnibox/IconButton';

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
    <IconButton
      type="button"
      size="sm"
      tone="accent"
      className="shrink-0"
      label={tooltipLabel}
      aria-label={label}
      aria-pressed={panel.panelOpen}
      onClick={toggle}
    >
      <MessageSquareText className="size-4" />
    </IconButton>
  );
}
