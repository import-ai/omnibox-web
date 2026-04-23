import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function MetaPage() {
  const { t } = useTranslation();

  return (
    <div className="text-balance text-center text-xs text-muted-foreground">
      {t('login.agree_our_rule')}{' '}
      <Link
        to="https://www.omnibox.pro/s/w3A0gJXVUI"
        className="underline-offset-2 hover:underline"
      >
        {t('login.service')}
      </Link>{' '}
      {t('login.and')}{' '}
      <Link
        to="https://www.omnibox.pro/s/qYdPydLfW7"
        className="underline-offset-2 hover:underline"
      >
        {t('login.privacy')}
      </Link>
      {t('login.dot')}
    </div>
  );
}
