import { useTranslation } from 'react-i18next';

import { formatExpiration } from './utils';

interface IProps {
  basic: {
    expired: boolean;
    expire_date: string | null;
  };
  premium?: {
    expired: boolean;
    expire_date: string | null;
  };
}

export function Expiration({ basic, premium }: IProps) {
  const { t } = useTranslation();

  const basicText = formatExpiration(basic.expired, basic.expire_date, t);

  if (!premium) {
    return (
      <div className="pt-2 text-right text-xs">
        <span className="font-semibold text-foreground">
          {t('quota.basic_period')}
        </span>
        <span className="text-muted-foreground">{basicText}</span>
      </div>
    );
  }

  const premiumText = formatExpiration(premium.expired, premium.expire_date, t);

  return (
    <div className="pt-2 text-right text-xs">
      <span className="font-semibold text-foreground">
        {t('quota.premium_period')}
      </span>
      <span className="mr-4 text-muted-foreground">{premiumText}</span>
      <span className="font-semibold text-foreground">
        {t('quota.basic_period')}
      </span>
      <span className="text-muted-foreground">{basicText}</span>
    </div>
  );
}
