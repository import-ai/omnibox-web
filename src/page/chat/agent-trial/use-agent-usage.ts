import { useEffect, useMemo, useState } from 'react';

import { http } from '@/lib/request';
import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chat-response.ts';
import { MessageDetail } from '@/page/chat/core/types/conversation';

export interface AgentUsageResponseDto {
  agent_trial_limit: number;
  agent_trial_remain: number;
  first_message_date: string;
  last_message_date: string;
}

export function useAgentUsage(namespaceId: string, messages: MessageDetail[]) {
  const [agentUsage, setAgentUsage] = useState<
    AgentUsageResponseDto | undefined
  >();

  const userMessageCount: number = useMemo<number>(() => {
    return messages.filter(
      message =>
        message.message.role === OpenAIMessageRole.USER &&
        message.status === MessageStatus.SUCCESS
    ).length;
  }, [messages.length]);

  useEffect(() => {
    http.get(`/namespaces/${namespaceId}/usages/agent`).then(setAgentUsage);
  }, [namespaceId, userMessageCount]);

  return {
    agentUsage,
  };
}
