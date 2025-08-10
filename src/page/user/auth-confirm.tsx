import axios from 'axios';
import { LoaderCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import extension from '@/lib/extension';
import { http } from '@/lib/request';
import { setGlobalCredential } from '@/page/user/util';

import WrapperPage from './wrapper';

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
    const source = axios.CancelToken.source();
    http
      .get(`/wechat/callback?code=${code}&state=${state}`, {
        cancelToken: source.token,
      })
      .then(res => {
        setGlobalCredential(res.id, res.access_token);
        extension().then(val => {
          if (val) {
            navigate('/', { replace: true });
          }
        });
      });
    return () => {
      source.cancel();
    };
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
