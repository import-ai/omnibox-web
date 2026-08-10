import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { getExpandedCopilotPath } from '@/page/copilot/copilotNavigation';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';

interface CloseCurrentResourceProps {
  namespaceId: string;
}

/** Closes the resource pane and promotes the current Copilot view to full page. */
export default function CloseCurrentResource({
  namespaceId,
}: CloseCurrentResourceProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const workspace = useCopilotStore(state =>
    getCopilotWorkspace(state, namespaceId)
  );
  const requestExpandFromResource = useCopilotStore(
    state => state.requestExpandFromResource
  );

  const handleClose = () => {
    const destination = getExpandedCopilotPath(namespaceId, workspace);
    // Keep the citation preview covering the underlying resource route until
    // the chat route commits. Clearing preview first would unhide that Outlet
    // (e.g. resource A) for a frame before navigation lands on the conversation.
    requestExpandFromResource(namespaceId);
    navigate(destination);
  };

  return (
    <DropdownMenuItem className="cursor-pointer gap-2" onClick={handleClose}>
      <X className="size-4 text-neutral-500 dark:text-[#a1a1a1]" />
      <span>{t('resource.close_current')}</span>
    </DropdownMenuItem>
  );
}
