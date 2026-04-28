import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { getRelatedTime } from '@/lib/time.ts';
import { getUpgradeLink } from '@/lib/upgrade-link';
import { useNamespaceRole } from '@/lib/use-namespace-role.ts';
import { useAgentUsage } from '@/page/chat/agent-trial/use-agent-usage';
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

      const onClick = () => {
        window.open(getUpgradeLink(i18n, namespaceId), '_blank');
      };

      return (
        <div className="flex justify-end mb-1 gap-3 text-sm">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <span className="text-muted-foreground cursor-default">
                {t('chat.trial.text', {
                  agent_trial_remain: agentUsage.agent_trial_remain,
                  agent_trial_limit: agentUsage.agent_trial_limit,
                })}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">
              {toolTipContents.map((item, index) => {
                return <p key={index}>{item}</p>;
              })}
            </TooltipContent>
          </Tooltip>
          {hasUpgradePermission ? (
            <Button
              variant="default"
              size="sm"
              className="text-sm h-5"
              onClick={onClick}
            >
              {t('namespace.upgrade')}
            </Button>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-pointer">
                  <Button
                    variant="default"
                    size="sm"
                    className="text-sm h-5"
                    disabled
                  >
                    {t('namespace.upgrade')}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{t('chat.trial.not_owner')}</TooltipContent>
            </Tooltip>
          )}
        </div>
      );
    }
  }
  return null;
}
