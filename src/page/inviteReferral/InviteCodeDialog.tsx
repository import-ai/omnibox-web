import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { Input } from '@/components/input';
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import { validateInviteCode } from '@/service/inviteReferral';

import { isValidInviteCode } from './registrationPolicy';

interface InviteCodeDialogProps {
  initialCode: string;
  onConfirm: (code: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

function InviteCodeCloseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4.58333 4.58333L17.4167 17.4167M17.4167 4.58333L4.58333 17.4167"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function InviteCodeDialog({
  initialCode,
  onConfirm,
  onOpenChange,
  open,
}: InviteCodeDialogProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCode(initialCode);
      setError('');
    }
  }, [initialCode, open]);

  const confirm = async () => {
    if (!code) {
      onConfirm('');
      onOpenChange(false);
      return;
    }
    if (!isValidInviteCode(code)) {
      setError(t('inviteReferral.code.invalid'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await validateInviteCode(code);
      if (!result.valid) {
        setError(t('inviteReferral.code.invalid'));
        return;
      }
      onConfirm(code);
      onOpenChange(false);
    } catch {
      setError(t('inviteReferral.code.invalid'));
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = code.length === 0 || isValidInviteCode(code);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/50" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[335px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-[18px] border-0 bg-[#FFFFFF] p-[18px] shadow-[0px_10px_14px_rgba(0,0,0,0.16)] outline-none dark:bg-popover',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]'
          )}
        >
          <div className="relative flex h-[22px] items-center">
            <DialogTitle className="text-[18px] font-bold leading-normal tracking-normal text-[#14141A] dark:text-foreground">
              {t('inviteReferral.code.title')}
            </DialogTitle>
            <button
              type="button"
              className="absolute right-0 top-0 inline-flex size-[22px] items-center justify-center text-[#737373] hover:text-foreground"
              aria-label={t('inviteReferral.common.close')}
              onClick={() => onOpenChange(false)}
            >
              <InviteCodeCloseIcon />
            </button>
          </div>
          <DialogDescription className="sr-only">
            {t('inviteReferral.code.placeholder')}
          </DialogDescription>
          <div className="pt-5">
            <Input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              value={code}
              disabled={submitting}
              placeholder={t('inviteReferral.code.placeholder')}
              className={cn(
                'h-10 rounded-lg border-[1.5px] border-[#F5F5F5] bg-[#FBFBFC] px-[14px] text-base leading-normal text-[#171717] shadow-none placeholder:text-[14px] placeholder:text-muted-foreground focus-visible:ring-0 dark:border-input dark:bg-background dark:text-foreground',
                error && 'border-destructive'
              )}
              onChange={event => {
                setCode(event.target.value.replace(/\D/g, ''));
                setError('');
              }}
              onPaste={event => {
                const text = event.clipboardData.getData('text').trim();
                if (text && !/^\d+$/.test(text)) {
                  event.preventDefault();
                  setError(t('inviteReferral.code.invalid'));
                }
              }}
              onKeyDown={event => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                if (canSubmit) void confirm();
              }}
            />
            {error ? (
              <p className="mt-2 pl-[15px] text-[12px] leading-[19px] text-[#E52E33]">
                {error}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            className={cn(
              'h-10 w-full rounded-lg bg-[#09090A] text-[16px] font-medium leading-normal',
              error ? 'mt-2' : 'mt-[21px]'
            )}
            loading={submitting}
            disabled={!canSubmit}
            onClick={() => void confirm()}
          >
            {t('inviteReferral.code.confirm')}
          </Button>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
