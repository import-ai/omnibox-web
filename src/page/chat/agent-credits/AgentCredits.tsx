import { useTranslation } from 'react-i18next';

import {
  UpgradeActionButton,
  UpgradeUsageTooltip,
} from '@/components/upgrade-action-button';
import { useNamespaceRole } from '@/lib/useNamespaceRole.ts';
import { useAgentCredits } from '@/page/chat/agent-credits/useAgentCredits';
import { MessageDetail } from '@/page/chat/core/types/conversation';

export function AgentCredits({
  namespaceId,
  messages,
}: {
  namespaceId: string;
  messages?: MessageDetail[];
}) {
  const { t } = useTranslation();
  const { agentCredits } = useAgentCredits(namespaceId, messages ?? []);
  const { role } = useNamespaceRole(namespaceId);
  const hasUpgradePermission: boolean = role === 'owner';

  if (!agentCredits || agentCredits.agent_credits_remain > 0) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center justify-end mb-1 gap-3 text-sm">
      <div className="min-w-0 flex-1 text-right sm:hidden">
        <UpgradeUsageTooltip
          textKey="chat.agent_credits.compact_text"
          tooltipItems={[t('chat.agent_credits.tooltip.base')]}
          tooltipSide="top"
          triggerClassName="inline-block max-w-full truncate text-muted-foreground cursor-pointer align-middle"
        />
      </div>
      <div className="hidden min-w-0 text-right sm:block">
        <UpgradeUsageTooltip
          textKey="chat.agent_credits.text"
          tooltipItems={[t('chat.agent_credits.tooltip.base')]}
        />
      </div>
      <UpgradeActionButton
        namespaceId={namespaceId}
        hasPermission={hasUpgradePermission}
        disabledReason={t('chat.trial.not_owner')}
        className="h-5 shrink-0 text-sm"
      />
    </div>
  );
}
