import { Maximize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/omnibox/IconButton';
import { useChatSubmissionPreparing } from '@/page/chat/chat-input/chatSubmissionStore';

import { useExpandCopilot } from './useExpandCopilot';

export default function ExpandCopilotButton({
  namespaceId,
}: {
  namespaceId: string;
}) {
  const { t } = useTranslation();
  const expand = useExpandCopilot(namespaceId);
  const preparing = useChatSubmissionPreparing(namespaceId);

  return (
    <IconButton
      label={t('copilot.expand_view')}
      size="sm"
      tone="sidebar"
      disabled={preparing}
      onClick={expand}
    >
      <Maximize2 className="size-4" />
    </IconButton>
  );
}
