import { useTranslation } from 'react-i18next';

import { MailIcon } from '@/assets/icons/email';
import { Button } from '@/components/button';

interface IProps {
  onClick: () => void;
  mode?: 'login' | 'register';
}

export default function Email({ onClick, mode = 'login' }: IProps) {
  const { t } = useTranslation();

  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="w-full [&_svg]:size-5"
    >
      <MailIcon className="text-blue-400" />
      {t(
        mode === 'register'
          ? 'register.register_use_email'
          : 'login.login_use_email'
      )}
    </Button>
  );
}
