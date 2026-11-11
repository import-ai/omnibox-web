import { CircleHelp } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/omnibox/Dialog';

export function CreditsHelp({ taskCode }: { taskCode: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const amount =
    taskCode === 'phone_bound'
      ? 600
      : taskCode === 'file_conversation_completed'
        ? 1000
        : null;
  if (!amount) return null;
  return (
    <>
      <button
        aria-label={t('inviteReferral.creditsHelp.label', { amount })}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
      >
        <CircleHelp className="size-4" strokeWidth={1.8} aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[85dvh] max-w-[420px] overflow-y-auto"
          showCloseButton={false}
        >
          <DialogTitle>{t('inviteReferral.creditsHelp.title')}</DialogTitle>
          <DialogDescription className="text-sm text-foreground">
            {t('inviteReferral.creditsHelp.description')}
          </DialogDescription>
          <p className="whitespace-pre-line text-sm leading-6 text-blue-500">
            {t(`inviteReferral.creditsHelp.examples${amount}`)}
          </p>
          {(['note', 'rewards', 'details'] as const).map(key => (
            <p key={key} className="text-sm leading-6">
              {t(`inviteReferral.creditsHelp.${key}`)}
            </p>
          ))}
          <Button className="w-full" onClick={() => setOpen(false)}>
            {t('inviteReferral.creditsHelp.confirm')}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
