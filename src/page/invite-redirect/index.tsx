import axios, { type CancelTokenSource } from 'axios';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/Button';
import { http } from '@/lib/request';
import WrapperPage from '@/page/user/WrapperPage';

export default function InviteRedirectPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const namespaceId = params.namespace_id!;
  const invitationId = params.invitation_id!;
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptFailed, setAcceptFailed] = useState(false);
  const acceptSourceRef = useRef<CancelTokenSource | null>(null);

  useEffect(() => {
    return () => {
      acceptSourceRef.current?.cancel();
      acceptSourceRef.current = null;
    };
  }, []);

  const acceptInvitation = () => {
    if (acceptSourceRef.current) {
      return;
    }

    setAcceptFailed(false);
    setIsAccepting(true);
    const source = axios.CancelToken.source();
    acceptSourceRef.current = source;
    http
      .post(
        `/namespaces/${namespaceId}/invitations/${invitationId}/accept`,
        undefined,
        {
          cancelToken: source.token,
          mute: true,
        }
      )
      .then(() => {
        navigate(`/${namespaceId}/chat`, { replace: true });
      })
      .catch(error => {
        if (axios.isCancel(error)) {
          return;
        }
        setAcceptFailed(true);
      })
      .finally(() => {
        if (acceptSourceRef.current === source) {
          acceptSourceRef.current = null;
          setIsAccepting(false);
        }
      });
  };

  return (
    <WrapperPage>
      <div className="flex flex-col gap-6 py-2 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">{t('invite.confirm_title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('invite.confirm_description')}
          </p>
          {acceptFailed && (
            <p role="alert" className="text-sm text-destructive">
              {t('invite.accept_failed')}
            </p>
          )}
        </div>
        <Button
          className="w-full"
          loading={isAccepting}
          onClick={acceptInvitation}
        >
          {t('invite.accept_invitation')}
        </Button>
      </div>
    </WrapperPage>
  );
}
