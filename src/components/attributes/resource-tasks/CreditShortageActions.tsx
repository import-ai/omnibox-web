import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { UpgradeActionButton } from '@/components/upgrade-action-button';
import useApp from '@/hooks/useApp';
import { useNamespaceRole } from '@/lib/useNamespaceRole';

export function CreditShortageActions({
  namespaceId,
}: {
  namespaceId: string;
}) {
  const { t } = useTranslation();
  const app = useApp();
  const { role } = useNamespaceRole(namespaceId);
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
        hasPermission={role === 'owner'}
        disabledReason={t('chat.agent_credits.not_owner')}
        labelKey="chat.agent_credits.expand_button"
        className="h-6 text-xs"
      />
    </span>
  );
}
