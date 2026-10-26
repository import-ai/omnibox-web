import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import useApplications from '@/hooks/useApplications';
import useUser from '@/hooks/useUser';
import PhoneValidate from '@/page/settings/tabs/account/PhoneValidate';
import { AlreadyBoundDialog } from '@/page/settings/tabs/applications/AlreadyBoundDialog';
import { beginCodeBind } from '@/page/settings/tabs/applications/beginCodeBind';
import { BindDialog } from '@/page/settings/tabs/applications/BindDialog';

const WECHAT_BOT_APP_ID = 'wechat_bot';

interface InviteTaskBindDialogsProps {
  namespaceId: string;
  phoneOpen: boolean;
  onPhoneOpenChange: (open: boolean) => void;
  wechatSession: number;
  onWechatClose: () => void;
  onBound: () => void;
}

export function InviteTaskBindDialogs({
  namespaceId,
  phoneOpen,
  onPhoneOpenChange,
  wechatSession,
  onWechatClose,
  onBound,
}: InviteTaskBindDialogsProps) {
  const { t } = useTranslation();
  const { user } = useUser();

  return (
    <>
      <Dialog open={phoneOpen} onOpenChange={onPhoneOpenChange}>
        <DialogContent className="w-[90%] max-w-[445px] border-none bg-transparent p-0 shadow-none dark:bg-transparent lg:w-[445px]">
          <VisuallyHidden>
            <DialogHeader>
              <DialogTitle>{t('phone.input_phone')}</DialogTitle>
              <DialogDescription>
                {t('phone.will_send_verification')}
              </DialogDescription>
            </DialogHeader>
          </VisuallyHidden>
          <div className="flex min-h-[280px] w-full items-center justify-center rounded-[12px] bg-background p-6 lg:min-h-[303px] lg:p-[48px_30px_32px_30px]">
            <PhoneValidate
              currentPhone={user?.phone}
              onFinish={() => {
                onPhoneOpenChange(false);
                onBound();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
      {wechatSession > 0 ? (
        <InviteWechatBindSession
          key={wechatSession}
          namespaceId={namespaceId}
          onBound={onBound}
          onClose={onWechatClose}
        />
      ) : null}
    </>
  );
}

function InviteWechatBindSession({
  namespaceId,
  onBound,
  onClose,
}: {
  namespaceId: string;
  onBound: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const {
    applications,
    loading,
    error,
    bindApplication,
    checkApplicationStatus,
  } = useApplications(namespaceId);
  const startedRef = useRef(false);
  const [phase, setPhase] = useState<'starting' | 'bind' | 'already'>(
    'starting'
  );
  const [bindingCode, setBindingCode] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [urlLink, setUrlLink] = useState<string | undefined>();

  useEffect(() => {
    if (loading || startedRef.current) return;
    startedRef.current = true;
    if (error || !namespaceId) {
      onClose();
      return;
    }

    const target = applications.find(app => app.app_id === WECHAT_BOT_APP_ID);
    if (!target) {
      toast.error(t('applications.bind.error'));
      onClose();
      return;
    }
    void beginCodeBind(target, bindApplication)
      .then(result => {
        if (result.status === 'already_bound') {
          setPhase('already');
          return;
        }
        if (!result.code) {
          toast.error(t('applications.bind.error'));
          onClose();
          return;
        }
        setBindingCode(result.code);
        setApplicationId(result.application.id);
        setUrlLink(result.application.attrs?.url_link);
        setPhase('bind');
        toast.success(
          t(
            result.resumed
              ? 'applications.bind.continue'
              : 'applications.bind.initiated'
          )
        );
      })
      .catch(() => {
        onClose();
      });
  }, [applications, bindApplication, error, loading, namespaceId, onClose, t]);

  if (phase === 'already') {
    return (
      <AlreadyBoundDialog
        open
        appId={WECHAT_BOT_APP_ID}
        onOpenChange={open => {
          if (!open) onClose();
        }}
      />
    );
  }

  if (phase !== 'bind') return null;

  return (
    <BindDialog
      open
      onOpenChange={open => {
        if (!open) onClose();
      }}
      bindingCode={bindingCode}
      urlLink={urlLink}
      applicationId={applicationId}
      appId={WECHAT_BOT_APP_ID}
      checkApplicationStatus={checkApplicationStatus}
      onBindingComplete={() => {
        toast.success(t('applications.bind.success'));
        onBound();
        onClose();
      }}
    />
  );
}
