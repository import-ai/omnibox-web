import { useTranslation } from 'react-i18next';

import {
  UpgradeActionButton,
  UpgradeTrialUsageTooltip,
} from '@/components/upgrade-action-button';
import { getRelatedTime } from '@/lib/time.ts';
import { useNamespaceRole } from '@/lib/useNamespaceRole.ts';
import { useAgentUsage } from '@/page/chat/agent-trial/useAgentUsage';
import { MessageDetail } from '@/page/chat/core/types/conversation';

export function AgentTrial({
  namespaceId,
  messages,
}: {
  namespaceId: string;
  messages?: MessageDetail[];
}) {
  const { t, i18n } = useTranslation();
  const { agentUsage } = useAgentUsage(namespaceId, messages ?? []);
  const { role } = useNamespaceRole(namespaceId);
  const hasUpgradePermission: boolean = role === 'owner';

  if (!agentUsage || agentUsage.agent_trial_remain !== 0) {
    return null;
  }

  const recoveryTime = getRelatedTime(
    new Date(
      new Date(agentUsage.first_message_date).getTime() + 24 * 60 * 60 * 1000
    ),
    i18n,
    false
  );

  return (
    <div className="flex flex-wrap items-center justify-end mb-1 gap-3 text-sm">
      <UpgradeTrialUsageTooltip
        textKey="chat.trial.text"
        textValues={{ related_time: recoveryTime }}
        tooltipItems={[t('chat.trial.tooltip.base')]}
      />
      <UpgradeActionButton
        namespaceId={namespaceId}
        hasPermission={hasUpgradePermission}
        disabledReason={t('chat.trial.not_owner')}
      />
    </div>
  );
}
