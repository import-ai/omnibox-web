import { useTranslation } from 'react-i18next';

import { usePaywall } from '@/components/paywall/paywallContext';
import {
  UpgradeActionButton,
  UpgradeUsageTooltip,
} from '@/components/upgrade-action-button';
import { useNamespaceInfo } from '@/hooks/useNamespaceInfo';
import { NamespaceTier } from '@/interface';
import { useNamespaceRole } from '@/lib/useNamespaceRole.ts';
import { cn } from '@/lib/utils';
import type { AgentCreditsResponseDto } from '@/page/chat/agent-credits/useAgentCredits';

export function AgentCredits({
  namespaceId,
  agentCredits,
  compact = false,
}: {
  namespaceId: string;
  agentCredits?: AgentCreditsResponseDto;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { showPaywall } = usePaywall();
  const { namespace } = useNamespaceInfo(namespaceId);
  const { role, loading: roleLoading } = useNamespaceRole(namespaceId);
  const tier = namespace?.tier ?? NamespaceTier.BASIC;
  const isOwner = namespace?.is_owner ?? role === 'owner';
  // The role request resolves after the first render; until then the button
  // must not treat an owner as a member and offer the contact-owner copy.
  const ownerResolved = namespace?.is_owner !== undefined || !roleLoading;
  const labelKey =
    tier === NamespaceTier.PREMIUM
      ? 'chat.agent_credits.buy_button'
      : 'chat.agent_credits.upgrade_button';

  if (!agentCredits || agentCredits.agent_credits_remain > 0) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center justify-end mb-1 gap-3 text-sm">
      <div className={cn('min-w-0 flex-1 text-right', !compact && 'sm:hidden')}>
        <UpgradeUsageTooltip
          textKey="chat.agent_credits.compact_text"
          tooltipItems={[t('chat.agent_credits.compact_tooltip')]}
          tooltipSide="top"
          triggerClassName="inline-block max-w-full truncate text-muted-foreground cursor-pointer align-middle"
          trackName="chat_usage_open"
        />
      </div>
      {!compact && (
        <div className="hidden min-w-0 text-right sm:block">
          <UpgradeUsageTooltip
            textKey="chat.agent_credits.compact_text"
            tooltipItems={[t('chat.agent_credits.compact_tooltip')]}
            trackName="chat_usage_open"
          />
        </div>
      )}
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
                  trigger: 'chat_agent_credits',
                })
            : undefined
        }
        className="h-5 shrink-0 bg-blue-500 text-sm text-white hover:bg-blue-600"
        labelKey={labelKey}
        trackName="chat_plan_upgrade"
        entry="chat_agent_credits"
      />
    </div>
  );
}
