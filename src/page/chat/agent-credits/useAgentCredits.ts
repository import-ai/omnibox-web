import { useCallback, useEffect, useRef, useState } from 'react';

import { http } from '@/lib/request';
import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse.ts';
import { MessageDetail } from '@/page/chat/core/types/conversation';

export interface AgentCreditsResponseDto {
  agent_credits_total: number;
  agent_credits_remain: number;
}

export function useAgentCredits(
  namespaceId: string,
  messages: MessageDetail[]
) {
  const [agentCredits, setAgentCredits] = useState<
    AgentCreditsResponseDto | undefined
  >();

  const [assistantMessageIds, setAssistantMessageIds] = useState<string[]>([]);
  const fetchGenerationRef = useRef(0);

  const fetchAgentCredits = useCallback(() => {
    const fetchGeneration = ++fetchGenerationRef.current;
    return http
      .get<AgentCreditsResponseDto>(`/namespaces/${namespaceId}/usages/agent`)
      .then(data => {
        if (fetchGeneration !== fetchGenerationRef.current) {
          return undefined;
        }
        setAgentCredits(data);
        return data;
      });
  }, [namespaceId]);

  useEffect(() => {
    fetchGenerationRef.current += 1;
    setAgentCredits(undefined);
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
    void fetchAgentCredits();
  }, [assistantMessageIds.length, fetchAgentCredits]);

  return {
    agentCredits,
  };
}
