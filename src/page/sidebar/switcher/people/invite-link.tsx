import { useState } from 'react';
import copy from 'copy-to-clipboard';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { http } from '@/lib/request';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
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
        <DialogContent className="w-[90%] sm:w-1/2 max-w-7xl p-4 sm:p-6">
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
      <div className="flex justify-between mb-4 flex-wrap">
        <div className="flex flex-col">
          <h2 className="font-medium mb-2">{t('invite.title')}</h2>
          <p className="text-muted-foreground text-sm">
            {t('invite.description')}
          </p>
        </div>
        <div className="flex items-center gap-2 justify-between">
          {!!invitationId && (
            <Button size="sm" variant="secondary" onClick={handleCopy}>
              {t('invite.receive_link')}
            </Button>
          )}
          <Switch
            checked={!!invitationId}
            onCheckedChange={handleCheckedChange}
            className="data-[state=checked]:bg-blue-500"
          />
        </div>
      </div>
    </>
  );
}
