import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function MetaPage() {
  const { t } = useTranslation();

  return (
    <div className="text-muted-foreground text-center text-xs text-balance">
      {t('login.agree_our_rule')}{' '}
      <Link
        to="https://www.omnibox.pro/s/w3A0gJXVUI"
        className="underline underline-offset-4"
      >
        {t('login.service')}
      </Link>{' '}
      {t('login.and')}{' '}
      <Link
        to="https://www.omnibox.pro/s/qYdPydLfW7"
        className="underline underline-offset-4"
      >
        {t('login.privacy')}
      </Link>
      {t('login.dot')}
    </div>
  );
}
