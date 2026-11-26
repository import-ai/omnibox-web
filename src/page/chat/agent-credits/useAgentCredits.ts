import { useCallback, useEffect, useRef, useState } from 'react';

import { http, type RequestConfig } from '@/lib/request';
import {
  isTerminalMessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse.ts';
import { MessageDetail } from '@/page/chat/core/types/conversation';

import type { CreditsLowBalanceExperiment } from '../credits-low-balance/creditsLowBalance';

// Billing is asynchronous even after the reply reaches a terminal status.
const SETTLEMENT_RECHECK_DELAYS_MS = [1000, 3000];
const FOREGROUND_RECONCILE_INTERVAL_MS = 15_000;
const automaticRecheckConfig: RequestConfig = {
  muteWhen: error => !error.response || error.response.status >= 500,
};

export interface AgentCreditsResponseDto {
  agent_credits_total: number;
  agent_credits_remain: number;
  low_balance_experiment?: CreditsLowBalanceExperiment;
}

export function useAgentCredits(
  namespaceId: string,
  messages: MessageDetail[],
  enabled = true,
  includeLowBalanceExperiment = false
) {
  const [snapshot, setSnapshot] = useState<
    { namespaceId: string; credits: AgentCreditsResponseDto } | undefined
  >();

  const [settledAssistantIds, setSettledAssistantIds] = useState<string[]>([]);
  const lastRefreshRef = useRef({ namespaceId, count: 0 });
  const fetchGenerationRef = useRef(0);

  const fetchAgentCredits = useCallback(
    (config?: RequestConfig) => {
      const fetchGeneration = ++fetchGenerationRef.current;
      const query = includeLowBalanceExperiment
        ? '?include_low_balance_experiment=true'
        : '';
      return http
        .get<AgentCreditsResponseDto>(
          `/namespaces/${namespaceId}/usages/agent${query}`,
          config
        )
        .then(data => {
          if (fetchGeneration !== fetchGenerationRef.current) {
            return undefined;
          }
          setSnapshot({ namespaceId, credits: data });
          return data;
        });
    },
    [namespaceId, includeLowBalanceExperiment]
  );

  useEffect(() => {
    fetchGenerationRef.current += 1;
    setSnapshot(undefined);
  }, [enabled, namespaceId]);

  useEffect(() => {
    for (const message of messages) {
      if (
        message.message.role === OpenAIMessageRole.ASSISTANT &&
        isTerminalMessageStatus(message.status)
      ) {
        setSettledAssistantIds(prev =>
          prev.includes(message.id) ? prev : [...prev, message.id]
        );
      }
    }
  }, [messages]);

  useEffect(() => {
    if (!enabled || !namespaceId) return;
    const previous = lastRefreshRef.current;
    const count = settledAssistantIds.length;
    const shouldRecheck =
      previous.namespaceId === namespaceId && count > previous.count;
    lastRefreshRef.current = { namespaceId, count };
    let refreshing = false;
    const refresh = async (config?: RequestConfig) => {
      if (refreshing || document.visibilityState === 'hidden') return;
      refreshing = true;
      try {
        await fetchAgentCredits(config);
      } catch {
        // Keep the last successful balance and try again on the next refresh.
      } finally {
        refreshing = false;
      }
    };
    void refresh();
    const recheck = () => void refresh(automaticRecheckConfig);
    const timers = shouldRecheck
      ? SETTLEMENT_RECHECK_DELAYS_MS.map(delay => setTimeout(recheck, delay))
      : [];
    const reconciliation =
      count > 0
        ? setInterval(recheck, FOREGROUND_RECONCILE_INTERVAL_MS)
        : undefined;
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(reconciliation);
    };
  }, [settledAssistantIds.length, enabled, fetchAgentCredits, namespaceId]);

  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      void fetchAgentCredits().catch(() => undefined);
    };
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      fetchGenerationRef.current += 1;
    };
  }, [enabled, fetchAgentCredits]);

  return {
    agentCredits:
      enabled && snapshot?.namespaceId === namespaceId
        ? snapshot.credits
        : undefined,
  };
}
