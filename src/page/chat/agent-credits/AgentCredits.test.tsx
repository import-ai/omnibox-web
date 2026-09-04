/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { useAgentCredits } from '@/page/chat/agent-credits/useAgentCredits';

import { AgentCredits } from './AgentCredits';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {},
  }),
}));

jest.mock('@/components/upgrade-action-button', () => ({
  UpgradeUsageTooltip: ({
    textKey,
    tooltipItems,
  }: {
    textKey: string;
    tooltipItems: string[];
  }) => <span>{`${textKey}:${tooltipItems.join('|')}`}</span>,
  UpgradeActionButton: () => <button>upgrade</button>,
}));

jest.mock('@/lib/useNamespaceRole.ts', () => ({
  useNamespaceRole: () => ({ role: 'owner' }),
}));

jest.mock('@/page/chat/agent-credits/useAgentCredits', () => ({
  useAgentCredits: jest.fn(),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('AgentCredits', () => {
  let container: HTMLDivElement;
  let root: Root;
  const mockUseAgentCredits = useAgentCredits as jest.MockedFunction<
    typeof useAgentCredits
  >;

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    jest.clearAllMocks();
  });

  it('hides the prompt while agent credits remain', async () => {
    mockUseAgentCredits.mockReturnValue({
      agentCredits: {
        agent_credits_total: 100000,
        agent_credits_remain: 1,
      },
    });

    await act(async () =>
      root.render(<AgentCredits namespaceId="namespace-a" />)
    );

    expect(container.innerHTML).toBe('');
  });

  it('hides the prompt while the credits are still loading', async () => {
    mockUseAgentCredits.mockReturnValue({ agentCredits: undefined });

    await act(async () =>
      root.render(<AgentCredits namespaceId="namespace-a" />)
    );

    expect(container.innerHTML).toBe('');
  });

  it('shows the prompt and upgrade button when credits are exhausted', async () => {
    mockUseAgentCredits.mockReturnValue({
      agentCredits: {
        agent_credits_total: 100000,
        agent_credits_remain: 0,
      },
    });

    await act(async () =>
      root.render(<AgentCredits namespaceId="namespace-a" />)
    );

    expect(container.textContent).toContain('chat.agent_credits.compact_text');
    expect(container.textContent).toContain('chat.agent_credits.text');
    expect(container.textContent).toContain('chat.agent_credits.tooltip.base');
    expect(container.textContent).toContain('upgrade');
  });

  it('reveals the exhausted-credits line from the compact prompt', async () => {
    mockUseAgentCredits.mockReturnValue({
      agentCredits: {
        agent_credits_total: 100000,
        agent_credits_remain: 0,
      },
    });

    await act(async () =>
      root.render(<AgentCredits namespaceId="namespace-a" />)
    );

    expect(container.textContent).toContain(
      'chat.agent_credits.compact_text:chat.agent_credits.compact_tooltip'
    );
  });

  it('shows the prompt when the credits are overdrawn', async () => {
    mockUseAgentCredits.mockReturnValue({
      agentCredits: {
        agent_credits_total: 100000,
        agent_credits_remain: -50,
      },
    });

    await act(async () =>
      root.render(<AgentCredits namespaceId="namespace-a" />)
    );

    expect(container.textContent).toContain('chat.agent_credits.text');
  });
});
