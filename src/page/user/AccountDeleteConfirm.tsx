import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { CompletedStatus } from '@/assets/icons/CompletedStatus';
import { ErrorStatus } from '@/assets/icons/ErrorStatus';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/ui/Spinner';
import { http } from '@/lib/request';

import { removeGlobalCredential } from './util';
import WrapperPage from './WrapperPage';

type DeletionState = 'loading' | 'success' | 'error';

export default function AccountDeleteConfirm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<DeletionState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMessage(t('setting.delete_account.invalid_token'));
      return;
    }

    // Confirm deletion
    http
      .post('/user/account/delete/confirm', { token }, { mute: true })
      .then(() => {
        removeGlobalCredential();

        setState('success');

        setTimeout(() => {
          navigate('/user/login', { replace: true });
        }, 3000);
      })
      .catch((error: any) => {
        setState('error');
        const errorCode = error?.response?.data?.code;

        if (errorCode === 'invalid_or_expired_token') {
          setErrorMessage(t('setting.delete_account.token_expired'));
        } else if (errorCode === 'cannot_delete_owner_with_members') {
          setErrorMessage(t('setting.delete_account.owner_with_members_error'));
        } else {
          setErrorMessage(t('setting.delete_account.deletion_failed'));
        }
      });
  }, [token, t, navigate]);

  return (
    <WrapperPage useCard={false}>
      {state === 'loading' && (
        <div className="text-center space-y-4">
          <Spinner className="mx-auto size-6 text-muted-foreground" />
          <h2 className="text-2xl font-bold">
            {t('setting.delete_account.processing')}
          </h2>
          <p className="text-balance text-sm text-muted-foreground">
            {t('setting.delete_account.processing_description')}
          </p>
        </div>
      )}

      {state === 'success' && (
        <div className="text-center space-y-4">
          <CompletedStatus className="mx-auto size-5" />
          <h2 className="text-2xl font-bold">
            {t('setting.delete_account.success_title')}
          </h2>
          <p className="text-balance text-sm text-muted-foreground">
            {t('setting.delete_account.success_description')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('setting.delete_account.redirecting')}
          </p>
        </div>
      )}

      {state === 'error' && (
        <div className="text-center space-y-4">
          <ErrorStatus className="mx-auto size-5" />
          <h2 className="text-2xl font-bold text-destructive">
            {t('setting.delete_account.error_title')}
          </h2>
          <p className="text-balance text-sm text-muted-foreground">
            {errorMessage}
          </p>
          <Button onClick={() => navigate('/user/login')}>
            {t('setting.delete_account.back_to_login')}
          </Button>
        </div>
      )}
    </WrapperPage>
  );
}
