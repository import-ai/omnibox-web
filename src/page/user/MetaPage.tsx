import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function MetaPage() {
  const { t } = useTranslation();

  return (
    <div className="text-muted-foreground text-center text-xs text-balance">
      {t('login.agree_our_rule')}{' '}
      <Link
        to="https://www.omnibox.pro/s/w3A0gJXVUI"
        className="text-[#71717a] dark:text-[#a1a1aa] hover:underline underline-offset-2"
      >
        {t('login.service')}
      </Link>{' '}
      {t('login.and')}{' '}
      <Link
        to="https://www.omnibox.pro/s/qYdPydLfW7"
        className="text-[#71717a] dark:text-[#a1a1aa] hover:underline underline-offset-2"
      >
        {t('login.privacy')}
      </Link>
      {t('login.dot')}
    </div>
  );
}
