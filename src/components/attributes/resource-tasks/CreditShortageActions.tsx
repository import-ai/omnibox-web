import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { usePaywall } from '@/components/paywall/paywallContext';
import { UpgradeActionButton } from '@/components/upgrade-action-button';
import useApp from '@/hooks/useApp';
import { useNamespaceInfo } from '@/hooks/useNamespaceInfo';
import { NamespaceTier } from '@/interface';
import { useNamespaceRole } from '@/lib/useNamespaceRole';

export function CreditShortageActions({
  namespaceId,
}: {
  namespaceId: string;
}) {
  const { t } = useTranslation();
  const app = useApp();
  const { showPaywall } = usePaywall();
  const { namespace } = useNamespaceInfo(namespaceId);
  const { role, loading: roleLoading } = useNamespaceRole(namespaceId);
  const isOwner = namespace?.is_owner ?? role === 'owner';
  const ownerResolved = namespace?.is_owner !== undefined || !roleLoading;
  const tier = namespace?.tier ?? NamespaceTier.BASIC;
  const labelKey =
    tier === NamespaceTier.PREMIUM
      ? 'chat.agent_credits.buy_button'
      : 'chat.agent_credits.upgrade_button';
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        className="h-6 text-xs"
        onClick={() => app.fire('open_settings', { tab: 'usage' })}
      >
        {t('quota.view_usage')}
      </Button>
      <UpgradeActionButton
        namespaceId={namespaceId}
        hasPermission={isOwner}
        disabledReason={t('chat.agent_credits.not_owner')}
        onDeniedPress={
          ownerResolved
            ? () =>
                showPaywall('credits_limit', {
                  namespaceId,
                  tier,
                  isOwner,
                  trigger: 'chat_credit_shortage',
                })
            : undefined
        }
        labelKey={labelKey}
        className="h-6 bg-blue-500 text-xs text-white hover:bg-blue-600"
      />
    </span>
  );
}
