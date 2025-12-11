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

import { AddNamespaceInvitationForm } from './add-form';

interface IProps {
  namespaceId: string;
  invitationId: string;
  refetch: () => void;
}

export default function InvitePeople(props: IProps) {
  const { namespaceId, invitationId, refetch } = props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const handleCopy = () => {
    copy(`${location.origin}/invite/${namespaceId}/${invitationId}`, {
      format: 'text/plain',
    });
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
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-foreground">
            {t('invite.title')}
          </h2>
          <p className="text-sm text-neutral-400">{t('invite.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          {!!invitationId && (
            <span
              className="cursor-pointer text-sm text-neutral-400 hover:text-foreground"
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
