import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { http } from '@/lib/request';

interface IProps {
  onSuccess: () => void;
}

export function GoogleLogin(props: IProps) {
  const { onSuccess } = props;
  const { t, i18n } = useTranslation();
  const loginWithGoogle = () => {
    http
      .get('/google/auth-url')
      .then(authUrl => {
        window.open(authUrl, 'googleLogin', 'width=500,height=600');
      })
      .catch(error => {
        toast.error(error.message, { position: 'bottom-right' });
      });
  };

  useEffect(() => {
    const messageFN = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      const { code, state } = event.data;
      if (code && state) {
        http
          .post(`/google/callback`, {
            code,
            state,
            lang: i18n.language,
          })
          .then(onSuccess)
          .catch(error => {
            toast.error(error.message, { position: 'bottom-right' });
          });
      }
    };
    window.addEventListener('message', messageFN);
    return () => {
      window.removeEventListener('message', messageFN);
    };
  }, []);

  return (
    <button
      onClick={loginWithGoogle}
      className="flex h-[30px] w-[71px] shrink-0 items-center justify-center rounded-md bg-foreground text-sm font-semibold text-background hover:opacity-90"
    >
      {t('setting.bind_btn')}
    </button>
  );
}
