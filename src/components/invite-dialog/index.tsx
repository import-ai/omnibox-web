import { UserPlus } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';

import ActionDialog from './ActionDialog';
import InviteForm from './people/InviteForm';

interface IProps {
  onFinish?: () => void;
  children?: React.ReactNode;
}

function withDialogOpenHandler(
  children: React.ReactNode,
  openDialog: () => void
): React.ReactNode {
  if (!React.isValidElement(children)) {
    return children;
  }

  const child = children as React.ReactElement<{
    onClick?: React.MouseEventHandler;
  }>;

  return React.cloneElement(child, {
    onClick: event => {
      child.props.onClick?.(event);
      if (!event.defaultPrevented) {
        openDialog();
      }
    },
  });
}

export default function Invite(props: IProps) {
  const { onFinish, children } = props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const trigger = children ? (
    withDialogOpenHandler(children, () => setOpen(true))
  ) : (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-full justify-start gap-1 px-2 font-medium text-muted-foreground"
      onClick={() => setOpen(true)}
    >
      <UserPlus />
      {t('invite.add')}
    </Button>
  );

  return (
    <>
      {trigger}
      <ActionDialog
        open={open}
        onOpenChange={setOpen}
        title={t('invite.add')}
        contentClassName="w-[90%] max-w-sm"
      >
        {close => (
          <InviteForm
            onFinish={() => {
              close();
              onFinish?.();
            }}
          />
        )}
      </ActionDialog>
    </>
  );
}
