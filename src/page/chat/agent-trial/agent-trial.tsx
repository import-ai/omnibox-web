import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { getRelatedTime } from '@/lib/time.ts';
import { useAgentUsage } from '@/page/chat/agent-trial/use-agent-usage';
import { MessageDetail } from '@/page/chat/core/types/conversation';

export function AgentTrial({
  namespaceId,
  lastMessage,
}: {
  namespaceId: string;
  lastMessage?: MessageDetail;
}) {
  const { t, i18n } = useTranslation();
  const { agentUsage } = useAgentUsage(namespaceId, lastMessage);
  if (agentUsage) {
    if (agentUsage.agent_trial_remain >= 0) {
      let toolTipContent: string;
      if (agentUsage.agent_trial_remain === agentUsage.agent_trial_limit) {
        toolTipContent = t('chat.trail.tooltip.base');
      } else {
        const firstMessageDate = new Date(agentUsage.first_message_date);
        const relatedTime = getRelatedTime(
          new Date(firstMessageDate.getTime() + 24 * 60 * 60 * 1000),
          i18n,
          false
        );
        toolTipContent = t('chat.trail.tooltip.in-use', {
          base_text: t('chat.trail.tooltip.base'),
          related_time: relatedTime,
          quota: agentUsage.agent_trial_remain + 1,
        });
      }

      return (
        <div className="flex justify-end mb-1 gap-3 text-sm">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <span className="text-muted-foreground cursor-pointer">
                {t('chat.trail.text', {
                  agent_trial_remain: agentUsage.agent_trial_remain,
                  agent_trial_limit: agentUsage.agent_trial_limit,
                })}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">{toolTipContent}</TooltipContent>
          </Tooltip>
          <Button variant="default" size="sm" className="text-sm h-5">
            {t('namespace.upgrade')}
          </Button>
        </div>
      );
    }
  }
  return null;
}
