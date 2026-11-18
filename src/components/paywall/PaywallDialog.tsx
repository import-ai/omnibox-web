import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import logoSvg from '@/assets/logo.svg';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/omnibox/Dialog';
import { useNamespaceInfo } from '@/hooks/useNamespaceInfo';
import { NamespaceTier } from '@/interface';
import { track } from '@/lib/sendTrackEvent';
import { getUpgradeLink } from '@/lib/upgradeLink';
import { useNamespaceRole } from '@/lib/useNamespaceRole';

import { usePaywall } from './paywallContext';
import { PAYWALL_SCENES, paywallCopyKey } from './paywallScenes';
import type { PaywallDismissReason } from './paywallTypes';

export function PaywallDialog() {
  const { t, i18n } = useTranslation();
  const { request, hidePaywall } = usePaywall();
  const namespaceId = request?.namespaceId;
  const { namespace: namespaceInfo, resolvedId } =
    useNamespaceInfo(namespaceId);
  const namespace =
    namespaceInfo?.id === namespaceId ? namespaceInfo : undefined;
  // The namespace record is authoritative when it is already in hand; the
  // role request only fills the gap for callers that pass no namespace.
  const { role, loading: roleLoading } = useNamespaceRole(
    request?.namespaceId,
    request?.isOwner === undefined && namespace?.is_owner === undefined
  );
  const viewTrackedRef = useRef<number | null>(null);

  const tier = namespace?.tier ?? request?.tier ?? NamespaceTier.BASIC;
  const isOwner =
    namespace?.is_owner ??
    request?.isOwner ??
    (namespaceId ? role === 'owner' : true);
  const roleResolved =
    request?.isOwner !== undefined ||
    !namespaceId ||
    (resolvedId === namespaceId && !roleLoading);
  const definition = request ? PAYWALL_SCENES[request.scene] : undefined;
  const open = Boolean(request && definition && roleResolved);

  useEffect(() => {
    if (!open || !request || viewTrackedRef.current === request.id) return;
    viewTrackedRef.current = request.id;
    void track('paywall_view', {
      scene: request.scene,
      role: isOwner ? 'owner' : 'member',
      namespace_tier: tier,
      trigger: request.trigger,
      namespace_id: request.namespaceId,
      quota_exhausted: true,
    }).catch(() => undefined);
  }, [isOwner, open, request, tier]);

  if (!request || !definition || !roleResolved) return null;

  const handleDismiss = (reason: PaywallDismissReason) => hidePaywall(reason);
  const copyKey = paywallCopyKey(request.scene, tier);
  // Premium fair-use caps cannot be raised by another purchase, so the card
  // only acknowledges instead of sending the owner to pricing.
  const noticeOnly =
    tier === NamespaceTier.PREMIUM && definition.premiumUpgrade === false;
  const title = isOwner ? t(`${copyKey}.title`) : t('paywall.non_owner_title');
  const description = isOwner
    ? t(`${copyKey}.description`)
    : `${t(`${copyKey}.title`)}\n${t(`${copyKey}.description`)}`;
  const cta =
    isOwner && !noticeOnly ? t(`${copyKey}.cta`) : t('paywall.acknowledge');

  const handleCta = () => {
    if (!isOwner || noticeOnly) {
      void track('paywall_cta_click', {
        scene: request.scene,
        action: 'acknowledge',
        role: isOwner ? 'owner' : 'member',
        namespace_tier: tier,
        trigger: request.trigger,
        namespace_id: request.namespaceId,
        quota_exhausted: true,
      }).catch(() => undefined);
      handleDismiss('acknowledge');
      return;
    }

    void track('paywall_cta_click', {
      scene: request.scene,
      action: 'pricing',
      role: 'owner',
      namespace_tier: tier,
      trigger: request.trigger,
      namespace_id: request.namespaceId,
      quota_exhausted: true,
    }).catch(() => undefined);
    handleDismiss('navigate');
    window.open(
      getUpgradeLink(i18n, request.namespaceId, definition.entry),
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) handleDismiss('dismiss');
      }}
    >
      <DialogContent
        className="w-[337px] max-w-[calc(100vw-32px)] gap-0 rounded-2xl p-5"
        aria-describedby={undefined}
      >
        <div className="flex items-center gap-3 pr-7">
          <img
            src={logoSvg}
            alt=""
            className="size-10 shrink-0 rounded-[10px]"
          />
          <span className="min-w-0 flex-1 truncate text-[17px] font-semibold leading-6 text-foreground">
            {t('paywall.brand')}
          </span>
        </div>

        <DialogTitle className="mt-6 text-[22px] font-bold leading-8 text-foreground">
          {title}
        </DialogTitle>
        <DialogDescription className="mt-2 whitespace-pre-line text-[15px] leading-6 text-muted-foreground">
          {description}
        </DialogDescription>

        <button
          type="button"
          className="mt-6 h-11 w-full rounded-xl bg-foreground text-base font-semibold text-background transition-opacity hover:opacity-90 active:opacity-80"
          onClick={handleCta}
        >
          {cta}
        </button>
      </DialogContent>
    </Dialog>
  );
}
