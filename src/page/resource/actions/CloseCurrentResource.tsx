import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { useChatSubmissionPreparing } from '@/page/chat/chat-input/chatSubmissionStore';
import { useExpandCopilot } from '@/page/copilot/useExpandCopilot';

interface CloseCurrentResourceProps {
  namespaceId: string;
}

/** Closes the resource pane and promotes the current Copilot view to full page. */
export default function CloseCurrentResource({
  namespaceId,
}: CloseCurrentResourceProps) {
  const { t } = useTranslation();
  const handleClose = useExpandCopilot(namespaceId);
  const preparing = useChatSubmissionPreparing(namespaceId);

  return (
    <DropdownMenuItem
      className="cursor-pointer gap-2"
      disabled={preparing}
      onClick={handleClose}
    >
      <X className="size-4 text-muted-foreground" />
      <span>{t('resource.close_current')}</span>
    </DropdownMenuItem>
  );
}
