import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { Spinner } from '@/components/ui/Spinner';

import {
  type AutoRenewal,
  formatAutoRenewalAmount,
  formatAutoRenewalDate,
  getAutoRenewalView,
} from './autoRenewal';
import { useAutoRenewal } from './useAutoRenewal';

interface AutoRenewalSectionProps {
  namespaceId: string;
  tier: AutoRenewal['tier'];
}

interface AutoRenewalCardProps {
  cancel: (renewal: AutoRenewal) => Promise<boolean>;
  canceling: boolean;
  contextLabel?: string;
  polling: boolean;
  renewal: AutoRenewal;
}

interface EnabledRenewalProps {
  amount: string;
  canCancel: boolean;
  isProcessing: boolean;
  nextBilling: string;
  onCancel: () => void;
  status: 'signing' | 'canceling' | 'enabled' | 'failed';
  tierLabel: string;
}

function EnabledRenewal({
  amount,
  canCancel,
  isProcessing,
  nextBilling,
  onCancel,
  status,
  tierLabel,
}: EnabledRenewalProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <AlertTitle className="mb-1 text-sm leading-normal tracking-normal">
          {tierLabel} ·{' '}
          {t(
            `namespace.auto_renewal.${status === 'canceling' ? 'cancel_pending' : status}`
          )}
        </AlertTitle>
        <AlertDescription className="text-muted-foreground">
          {status === 'canceling'
            ? t('namespace.auto_renewal.cancel_pending_description')
            : status === 'signing'
              ? t('namespace.auto_renewal.signing_description')
              : status === 'failed'
                ? t('namespace.auto_renewal.failed_description')
                : nextBilling
                  ? `${t('namespace.auto_renewal.next_billing', {
                      date: nextBilling,
                    })} ${t('namespace.auto_renewal.amount', { amount })}`
                  : t('namespace.auto_renewal.amount', { amount })}
        </AlertDescription>
      </div>
      {canCancel && (
        <Button
          variant="destructive"
          className="shrink-0 self-start sm:self-center"
          disabled={isProcessing}
          onClick={onCancel}
        >
          {isProcessing && <Spinner className="mr-2" />}
          {t(
            isProcessing
              ? 'namespace.auto_renewal.canceling'
              : 'namespace.auto_renewal.cancel'
          )}
        </Button>
      )}
    </div>
  );
}

function DisabledRenewal({
  periodEnd,
  tierLabel,
}: {
  periodEnd: string;
  tierLabel: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      <AlertTitle className="mb-1 text-sm leading-normal tracking-normal">
        {tierLabel} · {t('namespace.auto_renewal.disabled')}
      </AlertTitle>
      <AlertDescription className="text-muted-foreground">
        {t('namespace.auto_renewal.available_until', { date: periodEnd })}
      </AlertDescription>
    </div>
  );
}

interface CancelDialogProps {
  canceling: boolean;
  onCancel: () => Promise<boolean>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  periodEnd: string;
  signing: boolean;
}

function CancelDialog({
  canceling,
  onCancel,
  onOpenChange,
  open,
  periodEnd,
  signing,
}: CancelDialogProps) {
  const { t } = useTranslation();
  const handleCancel = async () => {
    if (await onCancel()) onOpenChange(false);
  };
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('namespace.auto_renewal.confirm_title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {signing
              ? t('namespace.auto_renewal.confirm_signing_description')
              : t('namespace.auto_renewal.confirm_description', {
                  date: periodEnd,
                })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={canceling}>
            {t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={canceling}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={event => {
              event.preventDefault();
              handleCancel();
            }}
          >
            {canceling && <Spinner className="mr-2" />}
            {t('namespace.auto_renewal.confirm_cancel')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AutoRenewalSection({
  namespaceId,
  tier,
}: AutoRenewalSectionProps) {
  const { t } = useTranslation();
  const { cancel, canceling, loading, polling, renewal } = useAutoRenewal(
    namespaceId,
    tier
  );

  if (loading) {
    return (
      <Alert
        className="mt-4 p-3"
        aria-label={t('namespace.auto_renewal.loading')}
      >
        <div className="h-12 animate-pulse rounded bg-muted" />
      </Alert>
    );
  }
  if (!renewal) return null;

  return (
    <AutoRenewalCard
      cancel={cancel}
      canceling={canceling}
      polling={polling}
      renewal={renewal}
    />
  );
}

export function AutoRenewalCard({
  cancel,
  canceling,
  contextLabel,
  polling,
  renewal,
}: AutoRenewalCardProps) {
  const { t, i18n } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const view = getAutoRenewalView(renewal);
  if (!view) return null;

  const tier = t(`namespace.auto_renewal.tier_${renewal.tier}`);
  const tierLabel = contextLabel ? `${contextLabel} · ${tier}` : tier;

  const periodEnd = renewal.current_period_end
    ? formatAutoRenewalDate(renewal.current_period_end)
    : '';
  const nextBilling = renewal.next_billing_at
    ? formatAutoRenewalDate(renewal.next_billing_at)
    : '';
  const amount = formatAutoRenewalAmount(
    renewal.amount,
    renewal.currency,
    i18n.resolvedLanguage || 'zh-CN'
  );

  return (
    <Alert className="mt-4 p-3">
      {view !== 'disabled' ? (
        <EnabledRenewal
          amount={amount}
          canCancel={renewal.can_cancel && view !== 'canceling'}
          isProcessing={canceling || polling}
          nextBilling={nextBilling}
          onCancel={() => setDialogOpen(true)}
          status={view}
          tierLabel={tierLabel}
        />
      ) : (
        <DisabledRenewal periodEnd={periodEnd} tierLabel={tierLabel} />
      )}
      {renewal.can_cancel && view !== 'canceling' && (
        <CancelDialog
          canceling={canceling}
          onCancel={() => cancel(renewal)}
          onOpenChange={setDialogOpen}
          open={dialogOpen}
          periodEnd={periodEnd}
          signing={view === 'signing'}
        />
      )}
    </Alert>
  );
}
