import { VisuallyHidden } from 'radix-ui';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/omnibox/Dialog';
import { SettingPageButton } from '@/components/omnibox/SettingPageButton';
import { Group } from '@/interface';

import { AddGroupInvitationForm } from './AddGroupInvitationForm';

interface IProps {
  namespaceId: string;
  groups: Array<Group>;
  open: boolean;
  onOpen: (open: boolean) => void;
  onFinish: () => void;
}

export function AddGroupInvitation(props: IProps) {
  const { namespaceId, groups, open, onOpen, onFinish } = props;
  const { t } = useTranslation();

  return (
    <>
      <SettingPageButton onClick={() => onOpen(true)}>
        {t('invite.title')}
      </SettingPageButton>
      <Dialog open={open} onOpenChange={onOpen}>
        <DialogContent className="w-[90%] max-w-7xl sm:max-w-7xl p-4 sm:w-1/2 sm:p-6">
          <DialogHeader>
            <DialogTitle>{t('invite.title')}</DialogTitle>
            <VisuallyHidden.Root>
              <DialogDescription></DialogDescription>
            </VisuallyHidden.Root>
          </DialogHeader>
          <AddGroupInvitationForm
            onFinish={onFinish}
            groups={groups}
            namespaceId={namespaceId}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
