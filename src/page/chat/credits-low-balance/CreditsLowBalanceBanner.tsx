import { PawPrint, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { NamespaceTier } from '@/interface';
import { track } from '@/lib/sendTrackEvent';
import { getUpgradeLink } from '@/lib/upgradeLink';
import { cn } from '@/lib/utils';

import {
  creditsLowBalanceAnalyticsProps,
  type CreditsLowBalanceVariant,
} from './creditsLowBalance';

interface CreditsLowBalanceBannerProps {
  isOwner: boolean;
  namespaceId: string;
  onDismiss: () => void;
  remainingCredits: number;
  thresholdCredits: number;
  variant: CreditsLowBalanceVariant;
}

export function CreditsLowBalanceBanner({
  isOwner,
  namespaceId,
  onDismiss,
  remainingCredits,
  thresholdCredits,
  variant,
}: CreditsLowBalanceBannerProps) {
  const { t, i18n } = useTranslation();
  const viewTrackedRef = useRef(false);
  const analyticsProps = creditsLowBalanceAnalyticsProps({
    namespaceId,
    remainingCredits,
    role: isOwner ? 'owner' : 'member',
    surface: 'banner',
    thresholdCredits,
    tier: NamespaceTier.PREMIUM,
    variant,
  });

  useEffect(() => {
    if (viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    void track('credits_low_balance_view', analyticsProps).catch(
      () => undefined
    );
  }, [isOwner, namespaceId, remainingCredits, thresholdCredits, variant]);

  const handleClose = () => {
    void track('credits_low_balance_dismiss', {
      ...analyticsProps,
      dismiss: 'button',
    }).catch(() => undefined);
    onDismiss();
  };

  const handleAction = () => {
    if (!isOwner) {
      void track('credits_low_balance_cta_click', {
        ...analyticsProps,
        action: 'acknowledge',
      }).catch(() => undefined);
      onDismiss();
      return;
    }

    void track('credits_low_balance_cta_click', {
      ...analyticsProps,
      action: 'pricing',
    }).catch(() => undefined);
    onDismiss();
    window.open(
      getUpgradeLink(i18n, namespaceId, 'paywall_credits_low_banner'),
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div
      role="status"
      aria-live="polite"
      data-credits-low-balance-banner
      className="mb-2 flex h-10 w-full items-center gap-2 rounded-lg border border-transparent bg-neutral-100 pl-3 pr-[3px] dark:border-white/[0.12] dark:bg-[#0A0A0A]"
    >
      <PawPrint
        aria-hidden="true"
        className="size-4 shrink-0 text-blue-500"
        strokeWidth={2.25}
      />
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="shrink-0 text-xs font-medium text-neutral-900 dark:text-neutral-200">
          {t('chat.credits_low.title')}
        </span>
        <span className="min-w-0 truncate text-[10px] text-neutral-500 dark:text-neutral-400">
          {isOwner
            ? t('chat.credits_low.owner_description')
            : t('chat.credits_low.non_owner_description')}
        </span>
      </div>
      <button
        type="button"
        onClick={handleAction}
        className={cn(
          'h-5 min-w-14 shrink-0 rounded-[6px] px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          isOwner
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-foreground text-background hover:opacity-90'
        )}
      >
        {isOwner
          ? t('chat.credits_low.buy_button')
          : t('chat.credits_low.acknowledge_button')}
      </button>
      <button
        type="button"
        aria-label={t('close')}
        onClick={handleClose}
        className="relative flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors after:absolute after:-inset-1 after:content-[''] hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:hover:bg-background/10"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
