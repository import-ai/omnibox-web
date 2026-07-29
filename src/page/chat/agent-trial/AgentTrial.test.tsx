/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { useAgentUsage } from '@/page/chat/agent-trial/useAgentUsage';

import { AgentTrial } from './AgentTrial';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {},
  }),
}));

jest.mock('@/components/upgrade-action-button', () => ({
  UpgradeTrialUsageTooltip: ({
    textKey,
    tooltipItems,
  }: {
    textKey: string;
    tooltipItems: string[];
  }) => <span>{`${textKey}:${tooltipItems.join('|')}`}</span>,
  UpgradeActionButton: () => <button>upgrade</button>,
}));

jest.mock('@/lib/time.ts', () => ({
  getRelatedTime: () => '2 hours',
}));

jest.mock('@/lib/useNamespaceRole.ts', () => ({
  useNamespaceRole: () => ({ role: 'owner' }),
}));

jest.mock('@/page/chat/agent-trial/useAgentUsage', () => ({
  useAgentUsage: jest.fn(),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('AgentTrial', () => {
  let container: HTMLDivElement;
  let root: Root;
  const mockUseAgentUsage = useAgentUsage as jest.MockedFunction<
    typeof useAgentUsage
  >;

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    jest.clearAllMocks();
  });

  it('hides the trial prompt while trial uses remain', async () => {
    mockUseAgentUsage.mockReturnValue({
      agentUsage: {
        agent_trial_limit: 10,
        agent_trial_remain: 1,
        first_message_date: '2026-07-24T00:00:00Z',
        last_message_date: '2026-07-24T01:00:00Z',
      },
    });

    await act(async () =>
      root.render(<AgentTrial namespaceId="namespace-a" />)
    );

    expect(container.innerHTML).toBe('');
  });

  it('shows the trial prompt and upgrade button when uses are exhausted', async () => {
    mockUseAgentUsage.mockReturnValue({
      agentUsage: {
        agent_trial_limit: 10,
        agent_trial_remain: 0,
        first_message_date: '2026-07-24T00:00:00Z',
        last_message_date: '2026-07-24T01:00:00Z',
      },
    });

    await act(async () =>
      root.render(<AgentTrial namespaceId="namespace-a" />)
    );

    expect(container.textContent).toContain('chat.trial.compact_text');
    expect(container.textContent).toContain('chat.trial.tooltip.recovery');
    expect(container.textContent).toContain('chat.trial.text');
    expect(container.textContent).toContain('chat.trial.tooltip.base');
    expect(container.textContent).toContain('upgrade');
  });
});
