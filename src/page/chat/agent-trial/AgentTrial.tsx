import { useTranslation } from 'react-i18next';

import {
  UpgradeActionButton,
  UpgradeTrialUsageTooltip,
} from '@/components/upgrade-action-button';
import useConfig from '@/hooks/useConfig';
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
  const { config, loading: configLoading } = useConfig();
  const isCommercial = !configLoading && config.commercial;
  const { agentUsage } = useAgentUsage(
    namespaceId,
    messages ?? [],
    isCommercial
  );
  const { role } = useNamespaceRole(namespaceId);
  const hasUpgradePermission: boolean = role === 'owner';

  if (!isCommercial) {
    return null;
  }

  if (agentUsage) {
    if (agentUsage.agent_trial_remain >= 0) {
      let toolTipContents: string[] = [t('chat.trial.tooltip.base')];
      if (agentUsage.agent_trial_remain !== agentUsage.agent_trial_limit) {
        const firstMessageDate = new Date(agentUsage.first_message_date);
        const firstRelatedTime = getRelatedTime(
          new Date(firstMessageDate.getTime() + 24 * 60 * 60 * 1000),
          i18n,
          false
        );

        const lastMessageDate = new Date(agentUsage.last_message_date);
        const lastRelatedTime = getRelatedTime(
          new Date(lastMessageDate.getTime() + 24 * 60 * 60 * 1000),
          i18n,
          false
        );

        if (lastRelatedTime !== firstRelatedTime) {
          toolTipContents.push(
            t('chat.trial.tooltip.related_time', {
              related_time: firstRelatedTime,
              quota: agentUsage.agent_trial_remain + 1,
            })
          );
        }
        toolTipContents.push(
          t('chat.trial.tooltip.related_time', {
            related_time: lastRelatedTime,
            quota: agentUsage.agent_trial_limit,
          })
        );
      }

      return (
        <div className="flex justify-end mb-1 gap-3 text-sm">
          <UpgradeTrialUsageTooltip
            textKey="chat.trial.text"
            textValues={{
              agent_trial_remain: agentUsage.agent_trial_remain,
              agent_trial_limit: agentUsage.agent_trial_limit,
            }}
            tooltipItems={toolTipContents}
          />
          <UpgradeActionButton
            namespaceId={namespaceId}
            hasPermission={hasUpgradePermission}
            disabledReason={t('chat.trial.not_owner')}
          />
        </div>
      );
    }
  }
  return null;
}
