import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Spinner } from '@/components/ui/spinner';
import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import { setGlobalCredential } from '@/page/user/util';

import WrapperPage from '../wrapper';

export default function AuthConfirmPage() {
  const app = useApp();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code = params.get('code');
  const state = params.get('state');

  useEffect(() => {
    if (!code || !state) {
      return;
    }
    let url = `/wechat/callback?code=${code}&state=${state}`;
    if (i18n.language) {
      url += `&lang=${i18n.language}`;
    }
    http
      .get(url)
      .then(res => {
        if (res.isBinding) {
          toast.success(t('setting.third_party_account.bound'), {
            position: 'bottom-right',
          });
          navigate('/', { replace: true });
          setTimeout(() => {
            app.fire('open_settings', {
              tab: 'third-party',
            });
          }, 2000);
        } else {
          setGlobalCredential(res.id, res.access_token);
          // Redirect to H5 or Web based on source
          if (res.source === 'h5' && res.h5_redirect) {
            const h5Url = `${res.h5_redirect}?token=${encodeURIComponent(res.access_token)}&uid=${encodeURIComponent(res.id)}`;
            window.location.href = h5Url;
          } else {
            // Check for stored redirect parameter
            const redirect = localStorage.getItem('oauth_redirect');
            if (redirect) {
              localStorage.removeItem('oauth_redirect');
              location.href = decodeURIComponent(redirect);
            } else {
              navigate('/', { replace: true });
            }
          }
        }
      })
      .catch(() => {
        navigate('/user/login', { replace: true });
      });
  }, [code, state, i18n.language]);

  return (
    <WrapperPage useCard={false}>
      {code && state ? (
        <div className="flex font-bold gap-2 justify-center items-center">
          <Spinner />
          {t('login.authorizing')}
        </div>
      ) : (
        <div className="flex  gap-2 justify-center items-center">
          {t('form.invalid_request')}
        </div>
      )}
    </WrapperPage>
  );
}
