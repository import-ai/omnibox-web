import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { GoogleIcon } from '@/assets/icons/GoogleIcon';
import { Button } from '@/components/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { http } from '@/lib/request';

interface IProps {
  mode?: 'login' | 'register';
  iconOnly?: boolean;
}

export default function Google(props: IProps) {
  const { mode = 'login', iconOnly = false } = props;
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  const label = t(
    mode === 'register'
      ? 'register.register_use_google'
      : 'login.login_use_google'
  );

  const loginWithGoogle = () => {
    http
      .get('/google/auth-url', {
        params: redirect ? { redirect } : undefined,
      })
      .then(authUrl => {
        window.location.href = authUrl;
      })
      .catch(error => {
        toast.error(error.message, { position: 'bottom-right' });
      });
  };

  const button = (
    <Button
      variant="outline"
      onClick={loginWithGoogle}
      aria-label={iconOnly ? label : undefined}
      className={
        iconOnly
          ? 'h-9 w-full px-0 [&_svg]:size-5 dark:[&_svg]:fill-white'
          : 'w-full [&_svg]:size-5 dark:[&_svg]:fill-white'
      }
    >
      <GoogleIcon />
      <span className={iconOnly ? 'sr-only' : undefined}>{label}</span>
    </Button>
  );

  if (!iconOnly) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
