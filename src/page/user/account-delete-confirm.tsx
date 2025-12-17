import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { http } from '@/lib/request';

import { removeGlobalCredential } from './util';

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
      .post('/user/account/delete/confirm', { token })
      .then(() => {
        setState('success');
        // Auto logout after 3 seconds
        setTimeout(() => {
          removeGlobalCredential();
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
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md p-8">
        {state === 'loading' && (
          <div className="text-center space-y-4">
            <svg
              className="mx-auto h-8 w-8 animate-spin text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <h2 className="text-xl font-semibold">
              {t('setting.delete_account.processing')}
            </h2>
            <p className="text-muted-foreground">
              {t('setting.delete_account.processing_description')}
            </p>
          </div>
        )}

        {state === 'success' && (
          <div className="text-center space-y-4">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h2 className="text-xl font-semibold">
              {t('setting.delete_account.success_title')}
            </h2>
            <p className="text-muted-foreground">
              {t('setting.delete_account.success_description')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('setting.delete_account.redirecting')}
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center space-y-4">
            <div className="text-destructive text-5xl mb-4">✕</div>
            <h2 className="text-xl font-semibold text-destructive">
              {t('setting.delete_account.error_title')}
            </h2>
            <p className="text-muted-foreground">{errorMessage}</p>
            <Button onClick={() => navigate('/user/login')}>
              {t('setting.delete_account.back_to_login')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
