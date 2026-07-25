import { useCallback, useEffect, useState } from 'react';

import { http } from '@/lib/request';
import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse.ts';
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

  const [assistantMessageIds, setAssistantMessageIds] = useState<string[]>([]);

  const fetchAgentUsage = useCallback(() => {
    return http
      .get(`/namespaces/${namespaceId}/usages/agent`)
      .then(setAgentUsage);
  }, [namespaceId]);

  useEffect(() => {
    let lastUserMessage: MessageDetail | undefined = undefined;
    for (const message of messages) {
      if (
        message.message.role === OpenAIMessageRole.ASSISTANT &&
        message.status !== MessageStatus.PENDING &&
        lastUserMessage !== undefined
      ) {
        setAssistantMessageIds(prev => {
          if (!prev.includes(message.id)) {
            console.log({ message });
            return [...prev, message.id];
          }
          return prev;
        });
      } else if (
        message.message.role === OpenAIMessageRole.USER &&
        message.status === MessageStatus.SUCCESS &&
        message.message.content
      ) {
        lastUserMessage = message;
      }
    }
  }, [messages, setAssistantMessageIds]);

  useEffect(() => {
    void fetchAgentUsage();
  }, [assistantMessageIds.length, fetchAgentUsage]);

  useEffect(() => {
    if (!agentUsage || agentUsage.agent_trial_remain !== 0) {
      return;
    }

    const firstMessageTime = new Date(agentUsage.first_message_date).getTime();
    if (!Number.isFinite(firstMessageTime)) {
      return;
    }

    const recoveryTime = firstMessageTime + 24 * 60 * 60 * 1000;
    const timeout = window.setTimeout(
      () => void fetchAgentUsage(),
      Math.max(recoveryTime - Date.now(), 0) + 1000
    );

    return () => window.clearTimeout(timeout);
  }, [
    agentUsage?.agent_trial_remain,
    agentUsage?.first_message_date,
    fetchAgentUsage,
  ]);

  return {
    agentUsage,
  };
}
