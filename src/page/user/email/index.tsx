import { Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
      <Mail />
      {t(
        mode === 'register'
          ? 'register.register_use_email'
          : 'login.login_use_email'
      )}
    </Button>
  );
}
