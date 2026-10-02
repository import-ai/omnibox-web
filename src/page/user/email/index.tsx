import { useTranslation } from 'react-i18next';

import { MailIcon } from '@/assets/icons/MailIcon';
import { Button } from '@/components/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';

interface IProps {
  onClick: () => void;
  mode?: 'login' | 'register';
  iconOnly?: boolean;
}

export default function Email({
  onClick,
  mode = 'login',
  iconOnly = false,
}: IProps) {
  const { t } = useTranslation();
  const label = t(
    mode === 'register'
      ? 'register.register_use_email'
      : 'login.login_use_email'
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
      <MailIcon className="text-blue-400" />
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
