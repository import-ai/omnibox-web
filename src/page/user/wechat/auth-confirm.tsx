import { LoaderCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

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
          app.fire('open_settings', {
            tab: 'third-party',
          });
          toast.success(t('setting.third_party_account.bind_success'), {
            position: 'bottom-right',
          });
        } else {
          setGlobalCredential(res.id, res.access_token);
          navigate('/', { replace: true });
        }
      })
      .catch(error => {
        toast.error(error.message, { position: 'bottom-right' });
        navigate('/user/login', { replace: true });
      });
  }, [code, state, i18n.language, navigate]);

  return (
    <WrapperPage useCard={false}>
      {code && state ? (
        <div className="flex font-bold gap-2 justify-center items-center">
          <LoaderCircle className="transition-transform animate-spin" />
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
