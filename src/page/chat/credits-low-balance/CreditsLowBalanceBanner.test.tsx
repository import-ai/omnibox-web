/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { track } from '@/lib/sendTrackEvent';
import { getUpgradeLink } from '@/lib/upgradeLink';

import { CreditsLowBalanceBanner } from './CreditsLowBalanceBanner';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN' },
  }),
}));

jest.mock('@/lib/sendTrackEvent', () => ({
  track: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/upgradeLink', () => ({
  getUpgradeLink: jest.fn(() => '/zh-cn/pricing?entry=low-banner'),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('CreditsLowBalanceBanner', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onDismiss = jest.fn();

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
    jest.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    jest.clearAllMocks();
  });

  function render(isOwner: boolean) {
    return act(async () =>
      root.render(
        <CreditsLowBalanceBanner
          isOwner={isOwner}
          namespaceId="namespace-a"
          onDismiss={onDismiss}
          remainingCredits={200_000_000}
          thresholdCredits={430}
          variant="premium"
        />
      )
    );
  }

  it('sends owners to pricing and tracks the banner exposure and click', async () => {
    await render(true);

    expect(track).toHaveBeenCalledWith(
      'credits_low_balance_view',
      expect.objectContaining({
        surface: 'banner',
        role: 'owner',
        experiment_variant: 'premium',
        threshold_kibble: 430,
      })
    );

    const buyButton = [...container.querySelectorAll('button')].find(button =>
      button.textContent?.includes('chat.credits_low.buy_button')
    );
    await act(async () => buyButton?.click());

    expect(track).toHaveBeenCalledWith(
      'credits_low_balance_cta_click',
      expect.objectContaining({ action: 'pricing', surface: 'banner' })
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(getUpgradeLink).toHaveBeenCalledWith(
      expect.anything(),
      'namespace-a',
      'paywall_credits_low_banner'
    );
    expect(window.open).toHaveBeenCalledWith(
      '/zh-cn/pricing?entry=low-banner',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('tracks banner exposure once while the balance refreshes', async () => {
    await render(true);
    await act(async () =>
      root.render(
        <CreditsLowBalanceBanner
          isOwner
          namespaceId="namespace-a"
          onDismiss={onDismiss}
          remainingCredits={150_000_000}
          thresholdCredits={430}
          variant="premium"
        />
      )
    );

    expect(
      (track as jest.Mock).mock.calls.filter(
        ([eventName]) => eventName === 'credits_low_balance_view'
      )
    ).toHaveLength(1);
  });

  it('only acknowledges non-owners', async () => {
    await render(false);

    const acknowledge = [...container.querySelectorAll('button')].find(button =>
      button.textContent?.includes('chat.credits_low.acknowledge_button')
    );
    await act(async () => acknowledge?.click());

    expect(track).toHaveBeenCalledWith(
      'credits_low_balance_cta_click',
      expect.objectContaining({
        action: 'acknowledge',
        role: 'member',
      })
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(window.open).not.toHaveBeenCalled();
  });

  it('tracks explicit banner close clicks', async () => {
    await render(true);

    const close = container.querySelector<HTMLButtonElement>(
      'button[aria-label="close"]'
    );
    await act(async () => close?.click());

    expect(track).toHaveBeenCalledWith(
      'credits_low_balance_dismiss',
      expect.objectContaining({ surface: 'banner', dismiss: 'button' })
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
