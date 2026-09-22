import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Spinner } from '@/components/ui/Spinner';
import useApp from '@/hooks/useApp';
import { http } from '@/lib/request';
import { completeAuthRedirect } from '@/page/inviteReferral/completeAuth';
import {
  markInviteReferralLanding,
  registerInviteAfterLogin,
} from '@/page/inviteReferral/registration';
import { setGlobalCredential } from '@/page/user/util';

import WrapperPage from '../WrapperPage';

export default function AuthConfirmPage() {
  const app = useApp();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code = params.get('code');
  const state = params.get('state');
  const redirect = params.get('redirect');

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
      .then(async res => {
        if (res.isBinding) {
          toast.success(t('setting.third_party_account.bound'), {
            position: 'bottom-right',
          });
          // Use redirectUrl from response first, fallback to URL param
          const finalRedirect = res.redirectUrl
            ? decodeURIComponent(res.redirectUrl)
            : redirect
              ? decodeURIComponent(redirect)
              : null;
          if (finalRedirect) {
            location.href = finalRedirect;
          } else {
            navigate('/', { replace: true });
            setTimeout(() => {
              app.fire('open_settings', {
                tab: 'profile',
              });
            }, 2000);
          }
        } else if (res.source === 'h5' && res.h5_redirect) {
          setGlobalCredential(res.id, res.access_token);
          const invite = await registerInviteAfterLogin(
            res.is_new_user === true,
            res.id
          );
          if (invite.result) {
            markInviteReferralLanding(invite.result.requires_phone_binding);
          }
          const h5Url = `${res.h5_redirect}?token=${encodeURIComponent(res.access_token)}&uid=${encodeURIComponent(res.id)}`;
          window.location.href = h5Url;
        } else {
          await completeAuthRedirect(res, res.redirectUrl || redirect);
        }
      })
      .catch(() => {
        navigate('/user/login', { replace: true });
      });
  }, [code, state, i18n.language, redirect]);

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
