import copy from 'copy-to-clipboard';
import { VisuallyHidden } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/omnibox/Dialog';
import { Switch } from '@/components/ui/Switch';
import { http } from '@/lib/request';
import { useSettingsToast } from '@/page/settings/SettingsToastProvider';

import { AddNamespaceInvitationForm } from './AddNamespaceInvitationForm';

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
        <DialogContent className="w-[90%] max-w-sm sm:max-w-sm p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{t('invite.title')}</DialogTitle>
            <VisuallyHidden.Root>
              <DialogDescription></DialogDescription>
            </VisuallyHidden.Root>
          </DialogHeader>
          <AddNamespaceInvitationForm
            namespaceId={namespaceId}
            onFinish={handleFinish}
          />
        </DialogContent>
      </Dialog>
      <div className="mb-4 grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 py-2">
        <div className="min-w-0">
          <h2 className="text-sm font-medium leading-5 text-foreground">
            {t('invite.title')}
          </h2>
          <p className="whitespace-normal text-xs leading-4 text-muted-foreground">
            {t('invite.description')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!!invitationId && (
            <span
              className="inline-flex cursor-pointer text-xs text-muted-foreground transition-all select-none hover:text-sidebar-accent-foreground active:translate-y-px"
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
