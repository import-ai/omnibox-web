import { PanelRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ChatIcon } from '@/assets/icons/ChatIcon';
import { IconButton } from '@/components/omnibox/IconButton';
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
  const showConversation = useCopilotStore(state => state.showConversation);
  const open = useCopilotStore(state => state.open);
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
    if (workspace.view === 'resource_history') {
      if (workspace.conversationId) {
        showConversation(namespaceId, workspace.conversationId);
      } else {
        showHome(namespaceId);
      }
    } else {
      open(namespaceId);
    }
  };

  return (
    <IconButton
      label={tooltipLabel}
      aria-label={label}
      size="sm"
      tone="accent"
      className="shrink-0"
      onClick={handleToggle}
    >
      {collapseOnly || copilotActive ? (
        <PanelRight className="size-4" />
      ) : (
        <ChatIcon className="size-4" />
      )}
    </IconButton>
  );
}
