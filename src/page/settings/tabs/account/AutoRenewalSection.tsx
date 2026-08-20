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

interface EnabledRenewalProps {
  amount: string;
  isProcessing: boolean;
  nextBilling: string;
  onCancel: () => void;
  status: 'enabled' | 'failed';
  tierLabel: string;
}

function EnabledRenewal({
  amount,
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
          {tierLabel} · {t(`namespace.auto_renewal.${status}`)}
        </AlertTitle>
        <AlertDescription className="text-muted-foreground">
          {status === 'failed'
            ? t('namespace.auto_renewal.failed_description')
            : nextBilling
              ? `${t('namespace.auto_renewal.next_billing', {
                  date: nextBilling,
                })} ${t('namespace.auto_renewal.amount', { amount })}`
              : t('namespace.auto_renewal.amount', { amount })}
        </AlertDescription>
      </div>
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
}

function CancelDialog({
  canceling,
  onCancel,
  onOpenChange,
  open,
  periodEnd,
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
            {t('namespace.auto_renewal.confirm_description', {
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
  const { t, i18n } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { cancel, canceling, loading, polling, renewal } = useAutoRenewal(
    namespaceId,
    tier
  );
  const view = getAutoRenewalView(renewal);
  const tierLabel = t(`namespace.auto_renewal.tier_${tier}`);

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
  if (!renewal || !view) return null;

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
          isProcessing={canceling || polling}
          nextBilling={nextBilling}
          onCancel={() => setDialogOpen(true)}
          status={view}
          tierLabel={tierLabel}
        />
      ) : (
        <DisabledRenewal periodEnd={periodEnd} tierLabel={tierLabel} />
      )}
      <CancelDialog
        canceling={canceling}
        onCancel={() => cancel(renewal)}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        periodEnd={periodEnd}
      />
    </Alert>
  );
}
