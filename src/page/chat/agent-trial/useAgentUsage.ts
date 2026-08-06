import { useCallback, useEffect, useRef, useState } from 'react';

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

const AGENT_TRIAL_RECOVERY_RETRY_MS = 30 * 1000;

function getAgentTrialRecoveryDelay(firstMessageDate: string) {
  const firstMessageTime = new Date(firstMessageDate).getTime();
  if (!Number.isFinite(firstMessageTime)) {
    return undefined;
  }

  const recoveryTime = firstMessageTime + 24 * 60 * 60 * 1000;
  return Math.max(recoveryTime - Date.now(), 0) + 1000;
}

export function useAgentUsage(namespaceId: string, messages: MessageDetail[]) {
  const [agentUsage, setAgentUsage] = useState<
    AgentUsageResponseDto | undefined
  >();

  const [assistantMessageIds, setAssistantMessageIds] = useState<string[]>([]);
  const fetchGenerationRef = useRef(0);

  const fetchAgentUsage = useCallback(
    (mute = false) => {
      const fetchGeneration = ++fetchGenerationRef.current;
      return http
        .get<AgentUsageResponseDto>(
          `/namespaces/${namespaceId}/usages/agent`,
          mute
            ? { mute: true, timeout: AGENT_TRIAL_RECOVERY_RETRY_MS }
            : undefined
        )
        .then(data => {
          if (fetchGeneration !== fetchGenerationRef.current) {
            return undefined;
          }
          setAgentUsage(data);
          return data;
        });
    },
    [namespaceId]
  );

  useEffect(() => {
    fetchGenerationRef.current += 1;
    setAgentUsage(undefined);
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

    const recoveryDelay = getAgentTrialRecoveryDelay(
      agentUsage.first_message_date
    );
    if (recoveryDelay === undefined) {
      return;
    }

    let stopped = false;
    let timeout: number;
    const refreshUsage = async () => {
      const usage = await fetchAgentUsage(true).catch(() => undefined);
      if (!stopped && (!usage || usage.agent_trial_remain === 0)) {
        timeout = window.setTimeout(
          refreshUsage,
          AGENT_TRIAL_RECOVERY_RETRY_MS
        );
      }
    };
    timeout = window.setTimeout(refreshUsage, recoveryDelay);

    return () => {
      stopped = true;
      window.clearTimeout(timeout);
    };
  }, [
    agentUsage?.agent_trial_remain,
    agentUsage?.first_message_date,
    fetchAgentUsage,
  ]);

  return {
    agentUsage,
  };
}
