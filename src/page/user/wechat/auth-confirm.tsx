import { LoaderCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { http } from '@/lib/request';
import { setGlobalCredential } from '@/page/user/util';

import WrapperPage from '../wrapper';

export default function AuthConfirmPage() {
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
        setGlobalCredential(res.id, res.access_token);

        // 根据来源判断跳转目标
        if (res.source === 'h5' && res.h5_redirect) {
          // 如果是H5来源，跳转到H5端并传递登录态
          const h5Url = `${res.h5_redirect}?token=${encodeURIComponent(res.access_token)}&uid=${encodeURIComponent(res.id)}`;
          window.location.href = h5Url;
        } else {
          // 否则跳转到Web端首页
          navigate('/', { replace: true });
        }
      })
      .catch(error => {
        toast.error(error.message, { position: 'bottom-right' });
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
