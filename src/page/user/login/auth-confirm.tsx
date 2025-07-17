import { useEffect } from 'react';
import WrapperPage from '../wrapper';
import { http } from '@/lib/request';
import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function AuthConfirmPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code = params.get('code');
  const state = params.get('state');

  useEffect(() => {
    if (!code || !state) {
      return;
    }
    http.get(`/wechat/callback?code=${code}&state=${state}`).then((res) => {
      localStorage.setItem('uid', res.id);
      localStorage.setItem('token', res.access_token);
      navigate('/', { replace: true });
    });
  }, [code, state]);

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
