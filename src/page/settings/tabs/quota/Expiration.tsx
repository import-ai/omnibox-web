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

  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      {premium && (
        <span>
          {t('quota.premium_period')}
          {formatExpiration(premium.expired, premium.expire_date, t)}
        </span>
      )}
      <span>
        {t('quota.basic_period')}
        {formatExpiration(basic.expired, basic.expire_date, t)}
      </span>
    </div>
  );
}
