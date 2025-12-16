import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import copy from 'copy-to-clipboard';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { http } from '@/lib/request';

import { useSettingsToast } from '../settings-toast';
import { AddNamespaceInvitationForm } from './add-form';

interface IProps {
  namespaceId: string;
  invitationId: string;
  refetch: () => void;
}

export default function InvitePeople(props: IProps) {
  const { namespaceId, invitationId, refetch } = props;
  const { t } = useTranslation();
  const { showToast } = useSettingsToast();
  const [open, setOpen] = useState(false);
  const handleCopy = () => {
    try {
      const success = copy(
        `${location.origin}/invite/${namespaceId}/${invitationId}`,
        {
          format: 'text/plain',
        }
      );
      if (success) {
        showToast(t('actions.copy_link_success'), 'success');
      } else {
        showToast(t('actions.copy_link_failed'), 'error');
      }
    } catch {
      showToast(t('actions.copy_link_failed'), 'error');
    }
  };
  const handleDisable = () => {
    if (invitationId) {
      http
        .delete(`/namespaces/${namespaceId}/invitations/${invitationId}`)
        .then(refetch);
    }
  };
  const handleCheckedChange = (value: boolean) => {
    if (value) {
      setOpen(true);
    } else {
      handleDisable();
    }
  };
  const handleFinish = () => {
    setOpen(false);
    refetch();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[90%] max-w-sm p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{t('invite.title')}</DialogTitle>
            <VisuallyHidden>
              <DialogDescription></DialogDescription>
            </VisuallyHidden>
          </DialogHeader>
          <AddNamespaceInvitationForm
            namespaceId={namespaceId}
            onFinish={handleFinish}
          />
        </DialogContent>
      </Dialog>
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1 lg:gap-2">
          <h2 className="text-sm lg:text-base font-semibold text-foreground">
            {t('invite.title')}
          </h2>
          <p className="text-xs lg:text-sm text-neutral-400">
            {t('invite.description')}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2 lg:mt-0">
          {!!invitationId && (
            <span
              className="cursor-pointer text-xs lg:text-sm text-neutral-400 hover:text-foreground"
              onClick={handleCopy}
            >
              {t('actions.copy_link')}
            </span>
          )}
          <Switch
            checked={!!invitationId}
            onCheckedChange={handleCheckedChange}
          />
        </div>
      </div>
    </>
  );
}
