import copy from 'copy-to-clipboard';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/button';
import { Input } from '@/components/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

import { buildLocalizedInviteUrl } from './inviteUrl';

interface InviteShareDialogProps {
  inviteCode: string;
  inviteUrl: string | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function InviteShareDialog({
  inviteCode,
  inviteUrl,
  onOpenChange,
  open,
}: InviteShareDialogProps) {
  const { i18n, t } = useTranslation();
  const localizedInviteUrl = inviteUrl
    ? buildLocalizedInviteUrl(
        inviteUrl,
        i18n.language.startsWith('zh') ? 'zh-cn' : 'en'
      )
    : null;
  const invitationText = localizedInviteUrl
    ? t('inviteReferral.share.copyInvitation', {
        inviteCode,
        inviteUrl: localizedInviteUrl,
      })
    : '';

  const copyValue = (value: string) => {
    if (!value) return;
    if (copy(value)) {
      toast.success(t('inviteReferral.share.copySuccess'), {
        position: 'bottom-right',
      });
      return;
    }
    toast.error(t('inviteReferral.share.copyFailed'), {
      position: 'bottom-right',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[510px] max-w-[calc(100vw-32px)] gap-5 rounded-xl p-6 sm:p-8">
        <DialogHeader className="space-y-0 text-left">
          <DialogTitle className="text-base font-medium">
            {t('inviteReferral.share.dialogTitle')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('inviteReferral.share.dialogDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-foreground">
              {t('inviteReferral.share.inviteCodeLabel')}
            </label>
            <div className="flex items-center gap-3">
              <Input readOnly value={inviteCode} className="h-10 flex-1" />
              <Button
                type="button"
                className="h-10 min-w-[70px] px-4"
                onClick={() => copyValue(inviteCode)}
              >
                {t('inviteReferral.share.copy')}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-foreground">
              {t('inviteReferral.share.inviteLinkLabel')}
            </label>
            <div className="flex items-center gap-3">
              <Input
                readOnly
                value={
                  invitationText || t('inviteReferral.share.linkUnavailable')
                }
                className="h-10 flex-1"
              />
              <Button
                type="button"
                className="h-10 min-w-[70px] px-4"
                disabled={!invitationText}
                onClick={() => copyValue(invitationText)}
              >
                {t('inviteReferral.share.copy')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
