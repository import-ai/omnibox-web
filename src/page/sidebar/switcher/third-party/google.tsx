import { toast } from 'sonner';
import { useEffect } from 'react';
import { http } from '@/lib/request';
import { Link } from 'lucide-react';
import { Button } from '@/components/button';
// import { useTranslation } from 'react-i18next';

interface IProps {
  onSuccess: () => void;
}

export function GoogleLogin(props: IProps) {
  const { onSuccess } = props;
  // const { t } = useTranslation();
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
          })
          .then(onSuccess)
          .catch(error => {
            toast.error(error.message, { position: 'bottom-right' });
          });
      }
    };
    // 等待回调页面传回结果
    window.addEventListener('message', messageFN);
    return () => {
      window.removeEventListener('message', messageFN);
    };
  }, []);

  return (
    <Button size="sm" variant="outline" onClick={loginWithGoogle}>
      <Link className="size-4 mr-2" />
      绑定
    </Button>
  );
}
