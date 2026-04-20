import { useEffect, useState } from 'react';

import { http } from '@/lib/request';
import { MessageDetail } from '@/page/chat/core/types/conversation';

export interface AgentUsageResponseDto {
  agent_trial_limit: number;
  agent_trial_remain: number;
  first_message_date: string;
  last_message_date: string;
}

export function useAgentUsage(
  namespaceId: string,
  lastMessage?: MessageDetail
) {
  const [agentUsage, setAgentUsage] = useState<
    AgentUsageResponseDto | undefined
  >();

  useEffect(() => {
    http.get(`/namespaces/${namespaceId}/usages/agent`).then(setAgentUsage);
  }, [namespaceId, lastMessage?.message?.role]);

  return {
    agentUsage,
  };
}
