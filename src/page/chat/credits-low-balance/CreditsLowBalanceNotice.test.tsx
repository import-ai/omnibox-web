/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { NamespaceTier } from '@/interface';

import { getCreditsLowBalanceDismissalKey } from './creditsLowBalance';
import { CreditsLowBalanceNotice } from './CreditsLowBalanceNotice';

const mockShowPaywall = jest.fn((...args: unknown[]) => {
  void args;
  return true;
});
const mockHidePaywall = jest.fn();
const mockPaywallRequest: {
  current: null | { scene: string; namespaceId: string };
} = { current: null };

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN' },
  }),
}));

jest.mock('@/components/paywall/paywallContext', () => ({
  usePaywall: () => ({
    request: mockPaywallRequest.current,
    showPaywall: mockShowPaywall,
    hidePaywall: mockHidePaywall,
  }),
}));

const mockNamespace: {
  tier: NamespaceTier;
  is_owner: boolean;
} = {
  tier: NamespaceTier.BASIC,
  is_owner: true,
};

jest.mock('@/hooks/useNamespaceInfo', () => ({
  useNamespaceInfo: (namespaceId?: string) => ({
    namespace: namespaceId ? { id: namespaceId, ...mockNamespace } : undefined,
    loading: false,
    resolvedId: namespaceId,
  }),
}));

jest.mock('@/lib/useNamespaceRole', () => ({
  useNamespaceRole: () => ({ role: 'owner', loading: false }),
}));

jest.mock('@/lib/sendTrackEvent', () => ({
  track: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/page/user/util', () => ({
  subscribeCredentials: jest.fn(() => () => undefined),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('CreditsLowBalanceNotice', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('uid', 'user-a');
    mockNamespace.tier = NamespaceTier.BASIC;
    mockNamespace.is_owner = true;
    mockShowPaywall.mockClear();
    mockShowPaywall.mockReturnValue(true);
    mockHidePaywall.mockClear();
    mockPaywallRequest.current = null;
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  function render(remainingCredits: number, selectedEdition: 'basic' | 'pro') {
    return act(async () =>
      root.render(
        <CreditsLowBalanceNotice
          namespaceId="namespace-a"
          remainingCredits={remainingCredits}
          selectedEdition={selectedEdition}
        />
      )
    );
  }

  it('opens the Basic prompt once the Agent 2.1 balance is below the bucket', async () => {
    await render(9_000_000, 'pro');

    expect(mockShowPaywall).toHaveBeenCalledWith(
      'credits_low',
      expect.objectContaining({
        namespaceId: 'namespace-a',
        trigger: 'chat_credits_low_balance_modal',
        experimentVariant: 'a',
        thresholdCredits: 10,
        remainingCredits: 9_000_000,
      })
    );
  });

  it('does not prompt on the free model', async () => {
    await render(1_000_000, 'basic');
    expect(mockShowPaywall).not.toHaveBeenCalled();
  });

  it('does not reopen the Basic modal after it is dismissed', async () => {
    await render(9_000_000, 'pro');
    const options = mockShowPaywall.mock.calls[0][1] as {
      onDismiss: (reason: string) => void;
    };
    await act(async () => options.onDismiss('close'));

    mockShowPaywall.mockClear();
    await render(8_000_000, 'pro');
    expect(mockShowPaywall).not.toHaveBeenCalled();
  });

  it('renders the Premium banner and keeps it closed after dismissal', async () => {
    mockNamespace.tier = NamespaceTier.PREMIUM;
    await render(200_000_000, 'pro');

    expect(
      container.querySelector('[data-credits-low-balance-banner]')
    ).not.toBeNull();

    const close = container.querySelector<HTMLButtonElement>(
      'button[aria-label="close"]'
    );
    await act(async () => close?.click());
    expect(
      container.querySelector('[data-credits-low-balance-banner]')
    ).toBeNull();
    expect(
      localStorage.getItem(
        getCreditsLowBalanceDismissalKey({
          namespaceId: 'namespace-a',
          tier: NamespaceTier.PREMIUM,
          userId: 'user-a',
          variant: 'premium',
        })
      )
    ).toBe('1');
  });

  it('hides the Basic modal when switching to the free model', async () => {
    mockPaywallRequest.current = {
      scene: 'credits_low',
      namespaceId: 'namespace-a',
    };
    await render(9_000_000, 'pro');
    expect(mockHidePaywall).not.toHaveBeenCalled();

    await render(9_000_000, 'basic');
    expect(mockHidePaywall).toHaveBeenCalledWith('automatic');
  });

  it('shows the Basic modal again after switching back to Agent 2.1', async () => {
    await render(9_000_000, 'pro');
    expect(mockShowPaywall).toHaveBeenCalledTimes(1);

    await render(9_000_000, 'basic');
    await render(9_000_000, 'pro');
    expect(mockShowPaywall).toHaveBeenCalledTimes(2);
  });

  it('re-arms the prompt after the balance rises above the threshold', async () => {
    mockNamespace.tier = NamespaceTier.PREMIUM;
    await render(200_000_000, 'pro');

    const close = container.querySelector<HTMLButtonElement>(
      'button[aria-label="close"]'
    );
    await act(async () => close?.click());
    expect(
      container.querySelector('[data-credits-low-balance-banner]')
    ).toBeNull();

    await render(431_000_000, 'pro');
    await render(200_000_000, 'pro');

    expect(
      container.querySelector('[data-credits-low-balance-banner]')
    ).not.toBeNull();
  });
});
