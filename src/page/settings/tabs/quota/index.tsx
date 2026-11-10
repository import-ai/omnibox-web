import { useTranslation } from 'react-i18next';

import { BillingRulesDialog } from '@/components/omnibox/BillingRulesDialog';
import { Spinner } from '@/components/ui/Spinner';
import useQuota from '@/hooks/useQuota';

import { CreditActivity } from './CreditActivity';
import { ExpandButton } from './ExpandButton';
import { Expiration } from './Expiration';
import { StorageSection } from './StorageSection';
import {
  formatCreditAmount,
  formatCredits,
  formatStorage,
  getSubscriptionPlanLabelKey,
} from './utils';

interface RemainQuotaProps {
  namespaceId: string;
}

export function RemainQuota({ namespaceId }: RemainQuotaProps) {
  const { t } = useTranslation();
  const { data, loading } = useQuota(namespaceId);

  if (loading) {
    return (
      <div className="my-5 flex h-40 items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const showOtherMembersUsage = data.show_members_usage;

  const segTooltip = (label: string, value: string) =>
    t('quota.tooltip_format', { label, value });

  const subscriptionLabel = t(getSubscriptionPlanLabelKey(data.premium));

  const buildTotalTooltip = (
    subscriptionTotal: number,
    onetimeTotal: number,
    formatFn: (n: number) => string
  ) => {
    if (subscriptionTotal === 0 && onetimeTotal === 0) return undefined;
    return (
      <div className="flex flex-col gap-0.5 text-xs">
        <div>
          {subscriptionLabel}
          {formatFn(subscriptionTotal)}
        </div>
        {onetimeTotal > 0 && (
          <div>
            {t('quota.onetime_pack')}
            {formatFn(onetimeTotal)}
          </div>
        )}
      </div>
    );
  };

  const sections = [
    {
      title: t('quota.credits_title'),
      action: <BillingRulesDialog />,
      current: `${formatCreditAmount(data.agent_credits.self + data.agent_credits.other_users)} / ${formatCreditAmount(data.agent_credits.total)} ${t('quota.credit_unit')}`,
      currentTooltip: buildTotalTooltip(
        data.agent_credits.subscription_total,
        data.agent_credits.onetime_total,
        formatCredits
      ),
      items: showOtherMembersUsage
        ? [
            {
              label: t('quota.my_usage'),
              color: 'bg-blue-500',
              tooltip: segTooltip(
                t('quota.my_usage'),
                formatCredits(data.agent_credits.self)
              ),
            },
            {
              label: t('quota.other_users'),
              color: 'bg-muted-foreground/40',
              tooltip: segTooltip(
                t('quota.other_users'),
                formatCredits(data.agent_credits.other_users)
              ),
            },
          ]
        : [
            {
              label: t('quota.my_usage'),
              color: 'bg-blue-500',
              tooltip: segTooltip(
                t('quota.my_usage'),
                formatCredits(data.agent_credits.self)
              ),
            },
          ],
      segments: showOtherMembersUsage
        ? [
            {
              label: t('quota.my_usage'),
              color: 'bg-blue-500',
              percentage:
                data.agent_credits.total > 0
                  ? (data.agent_credits.self / data.agent_credits.total) * 100
                  : 0,
              tooltip: segTooltip(
                t('quota.my_usage'),
                formatCredits(data.agent_credits.self)
              ),
            },
            {
              label: t('quota.other'),
              color: 'bg-muted-foreground/40',
              percentage:
                data.agent_credits.total > 0
                  ? (data.agent_credits.other_users /
                      data.agent_credits.total) *
                    100
                  : 0,
              tooltip: segTooltip(
                t('quota.other_users'),
                formatCredits(data.agent_credits.other_users)
              ),
            },
          ]
        : [
            {
              label: t('quota.my_usage'),
              color: 'bg-blue-500',
              percentage:
                data.agent_credits.total > 0
                  ? (data.agent_credits.self / data.agent_credits.total) * 100
                  : 0,
              tooltip: segTooltip(
                t('quota.my_usage'),
                formatCredits(data.agent_credits.self)
              ),
            },
          ],
    },
    {
      title: t('quota.storage_usage'),
      action: undefined,
      current: `${formatStorage(data.storage_bytes.upload + data.storage_bytes.file + data.storage_bytes.other_users)} / ${formatStorage(data.storage_bytes.total)}`,
      currentTooltip: buildTotalTooltip(
        data.storage_bytes.subscription_total,
        data.storage_bytes.onetime_total,
        formatStorage
      ),
      items: showOtherMembersUsage
        ? [
            {
              label: t('quota.upload'),
              color: 'bg-blue-400',
              tooltip: segTooltip(
                t('quota.upload'),
                formatStorage(data.storage_bytes.upload)
              ),
            },
            {
              label: t('quota.file'),
              color: 'bg-blue-500',
              tooltip: segTooltip(
                t('quota.file'),
                formatStorage(data.storage_bytes.file)
              ),
            },
            {
              label: t('quota.other_users'),
              color: 'bg-muted-foreground/40',
              tooltip: segTooltip(
                t('quota.other_users'),
                formatStorage(data.storage_bytes.other_users)
              ),
            },
          ]
        : [
            {
              label: t('quota.upload'),
              color: 'bg-blue-400',
              tooltip: segTooltip(
                t('quota.upload'),
                formatStorage(data.storage_bytes.upload)
              ),
            },
            {
              label: t('quota.file'),
              color: 'bg-blue-500',
              tooltip: segTooltip(
                t('quota.file'),
                formatStorage(data.storage_bytes.file)
              ),
            },
          ],
      segments: showOtherMembersUsage
        ? [
            {
              label: t('quota.upload'),
              color: 'bg-blue-400',
              percentage:
                data.storage_bytes.total > 0
                  ? (data.storage_bytes.upload / data.storage_bytes.total) * 100
                  : 0,
              tooltip: segTooltip(
                t('quota.upload'),
                formatStorage(data.storage_bytes.upload)
              ),
            },
            {
              label: t('quota.file'),
              color: 'bg-blue-500',
              percentage:
                data.storage_bytes.total > 0
                  ? (data.storage_bytes.file / data.storage_bytes.total) * 100
                  : 0,
              tooltip: segTooltip(
                t('quota.file'),
                formatStorage(data.storage_bytes.file)
              ),
            },
            {
              label: t('quota.other'),
              color: 'bg-muted-foreground/40',
              percentage:
                data.storage_bytes.total > 0
                  ? (data.storage_bytes.other_users /
                      data.storage_bytes.total) *
                    100
                  : 0,
              tooltip: segTooltip(
                t('quota.other_users'),
                formatStorage(data.storage_bytes.other_users)
              ),
            },
          ]
        : [
            {
              label: t('quota.upload'),
              color: 'bg-blue-400',
              percentage:
                data.storage_bytes.total > 0
                  ? (data.storage_bytes.upload / data.storage_bytes.total) * 100
                  : 0,
              tooltip: segTooltip(
                t('quota.upload'),
                formatStorage(data.storage_bytes.upload)
              ),
            },
            {
              label: t('quota.file'),
              color: 'bg-blue-500',
              percentage:
                data.storage_bytes.total > 0
                  ? (data.storage_bytes.file / data.storage_bytes.total) * 100
                  : 0,
              tooltip: segTooltip(
                t('quota.file'),
                formatStorage(data.storage_bytes.file)
              ),
            },
          ],
    },
  ];

  return (
    <div className="my-5">
      <div className="space-y-6">
        {sections.map((section, idx) => (
          <StorageSection
            key={idx}
            title={section.title}
            action={section.action}
            current={section.current}
            currentTooltip={section.currentTooltip}
            items={section.items}
            segments={section.segments}
          />
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between gap-4">
        <Expiration basic={data.basic} premium={data.premium} />
        <ExpandButton namespaceId={namespaceId} />
      </div>
      <CreditActivity key={namespaceId} namespaceId={namespaceId} />
    </div>
  );
}
