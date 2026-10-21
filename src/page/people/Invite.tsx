import { VisuallyHidden } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import InviteForm from '@/components/invite-dialog/people/InviteForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/omnibox/Dialog';

export default function Invite() {
  const { t } = useTranslation();
  const [open, onOpen] = useState(false);
  const onCancel = () => {
    onOpen(false);
  };

  return (
    <>
      <Button size="sm" variant="default" onClick={() => onOpen(true)}>
        {t('invite.add')}
      </Button>
      <Dialog open={open} onOpenChange={onOpen}>
        <DialogContent className="w-[90%] max-w-7xl sm:max-w-7xl p-4 sm:w-1/2 sm:p-6">
          <DialogHeader>
            <DialogTitle>{t('invite.add')}</DialogTitle>
            <VisuallyHidden.Root>
              <DialogDescription></DialogDescription>
            </VisuallyHidden.Root>
          </DialogHeader>
          <InviteForm onFinish={onCancel} />
        </DialogContent>
      </Dialog>
    </>
  );
}
