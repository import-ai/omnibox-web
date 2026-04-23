import { UserPlus } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

import ActionDialog from './action-dialog';
import InviteForm from './people/invite-form';

interface IProps {
  onFinish?: () => void;
  children?: React.ReactNode;
}

export default function Invite(props: IProps) {
  const { onFinish, children } = props;
  const { t } = useTranslation();

  return (
    <ActionDialog
      title={t('invite.add')}
      contentClassName="w-[90%] max-w-sm"
      trigger={
        children || (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-full justify-start gap-1 px-2 font-medium text-muted-foreground"
          >
            <UserPlus />
            {t('invite.add')}
          </Button>
        )
      }
    >
      {close => (
        <InviteForm
          onFinish={() => {
            close();
            onFinish && onFinish();
          }}
        />
      )}
    </ActionDialog>
  );
}
