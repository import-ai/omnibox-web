import { useTranslation } from 'react-i18next';

import { SmartphoneIcon } from '@/assets/icons/SmartphoneIcon';
import { Button } from '@/components/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';

interface IProps {
  onClick: () => void;
  mode?: 'login' | 'register';
  iconOnly?: boolean;
}

export default function Phone({
  onClick,
  mode = 'login',
  iconOnly = false,
}: IProps) {
  const { t } = useTranslation();
  const label = t(
    mode === 'register'
      ? 'register.register_use_phone'
      : 'login.login_use_phone'
  );

  const button = (
    <Button
      variant="outline"
      onClick={onClick}
      aria-label={label}
      className={
        iconOnly ? 'h-9 w-full px-0 [&_svg]:size-5' : 'w-full [&_svg]:size-5'
      }
    >
      <SmartphoneIcon />
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
