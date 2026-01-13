import { Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';

interface IProps {
  onClick: () => void;
  mode?: 'login' | 'register';
}

export default function Phone({ onClick, mode = 'login' }: IProps) {
  const { t } = useTranslation();

  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="w-full [&_svg]:size-5"
    >
      <Smartphone />
      {t(
        mode === 'register'
          ? 'register.register_use_phone'
          : 'login.login_use_phone'
      )}
    </Button>
  );
}
