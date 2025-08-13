import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Group } from '@/interface';

import { AddGroupInvitationForm } from './add-form';

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
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          {t('invite.title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[90%] sm:w-1/2 max-w-7xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{t('invite.title')}</DialogTitle>
          <VisuallyHidden>
            <DialogDescription></DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        <AddGroupInvitationForm
          onFinish={onFinish}
          groups={groups}
          namespaceId={namespaceId}
        />
      </DialogContent>
    </Dialog>
  );
}
