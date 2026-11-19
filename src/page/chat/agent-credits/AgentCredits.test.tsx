/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

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
  UpgradeActionButton: ({ labelKey }: { labelKey?: string }) => (
    <button>{labelKey ?? 'namespace.upgrade'}</button>
  ),
}));

jest.mock('@/lib/useNamespaceRole.ts', () => ({
  useNamespaceRole: () => ({ role: 'owner' }),
}));

const mockNamespaceInfo: {
  namespace:
    { id: string; tier: 'basic' | 'premium'; is_owner: boolean } | undefined;
} = {
  namespace: { id: 'namespace-a', tier: 'basic', is_owner: true },
};

jest.mock('@/hooks/useNamespaceInfo', () => ({
  useNamespaceInfo: () => ({
    namespace: mockNamespaceInfo.namespace,
    loading: false,
  }),
}));

jest.mock('@/components/paywall', () => ({
  usePaywall: () => ({
    request: null,
    showPaywall: jest.fn(),
    hidePaywall: jest.fn(),
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('AgentCredits', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    jest.clearAllMocks();
  });

  it('hides the prompt while agent credits remain', async () => {
    await act(async () =>
      root.render(
        <AgentCredits
          namespaceId="namespace-a"
          agentCredits={{
            agent_credits_total: 100000,
            agent_credits_remain: 1,
          }}
        />
      )
    );

    expect(container.innerHTML).toBe('');
  });

  it('hides the prompt while the credits are still loading', async () => {
    await act(async () =>
      root.render(<AgentCredits namespaceId="namespace-a" />)
    );

    expect(container.innerHTML).toBe('');
  });

  it('shows the prompt and expand button when credits are exhausted', async () => {
    await act(async () =>
      root.render(
        <AgentCredits
          namespaceId="namespace-a"
          agentCredits={{
            agent_credits_total: 100000,
            agent_credits_remain: 0,
          }}
        />
      )
    );

    expect(container.textContent).toContain('chat.agent_credits.compact_text');
    expect(container.textContent).toContain(
      'chat.agent_credits.compact_tooltip'
    );
    expect(container.textContent).toContain(
      'chat.agent_credits.upgrade_button'
    );
  });

  it('labels the action as a purchase for Premium spaces', async () => {
    mockNamespaceInfo.namespace = {
      id: 'namespace-a',
      tier: 'premium',
      is_owner: true,
    };
    try {
      await act(async () =>
        root.render(
          <AgentCredits
            namespaceId="namespace-a"
            agentCredits={{
              agent_credits_total: 100000,
              agent_credits_remain: 0,
            }}
          />
        )
      );

      expect(container.textContent).toContain('chat.agent_credits.buy_button');
    } finally {
      mockNamespaceInfo.namespace = {
        id: 'namespace-a',
        tier: 'basic',
        is_owner: true,
      };
    }
  });

  it('reveals the exhausted-credits line from the compact prompt', async () => {
    await act(async () =>
      root.render(
        <AgentCredits
          namespaceId="namespace-a"
          agentCredits={{
            agent_credits_total: 100000,
            agent_credits_remain: 0,
          }}
        />
      )
    );

    expect(container.textContent).toContain(
      'chat.agent_credits.compact_text:chat.agent_credits.compact_tooltip'
    );
  });

  it('shows the prompt when the credits are overdrawn', async () => {
    await act(async () =>
      root.render(
        <AgentCredits
          namespaceId="namespace-a"
          agentCredits={{
            agent_credits_total: 100000,
            agent_credits_remain: -50,
          }}
        />
      )
    );

    expect(container.textContent).toContain('chat.agent_credits.compact_text');
  });
});
