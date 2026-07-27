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
    <div className="flex min-w-0 items-center justify-end mb-1 gap-3 text-sm">
      <div className="min-w-0 flex-1 text-right sm:hidden">
        <UpgradeTrialUsageTooltip
          textKey="chat.trial.compact_text"
          tooltipItems={[
            t('chat.trial.tooltip.recovery', {
              related_time: recoveryTime,
            }),
          ]}
          tooltipSide="top"
          triggerClassName="inline-block max-w-full truncate text-muted-foreground cursor-pointer align-middle"
          openOnClick
        />
      </div>
      <div className="hidden min-w-0 text-right sm:block">
        <UpgradeTrialUsageTooltip
          textKey="chat.trial.text"
          textValues={{ related_time: recoveryTime }}
          tooltipItems={[t('chat.trial.tooltip.base')]}
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
