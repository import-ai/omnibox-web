import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface MetaPageProps {
  checked: boolean;
  setChecked: (checked: boolean) => void;
}

export default function MetaPage({ checked, setChecked }: MetaPageProps) {
  const { t } = useTranslation();

  return (
    <div className="flex justify-center items-start gap-3">
      <Checkbox id="terms" checked={checked} onCheckedChange={setChecked} />
      <Label
        htmlFor="terms"
        className="text-muted-foreground text-xs text-balance"
      >
        {t('login.agree_our_rule')}{' '}
        <Link
          to="/single/terms-of-service"
          className="underline underline-offset-4"
        >
          {t('login.service')}
        </Link>{' '}
        {t('login.and')}{' '}
        <Link
          to="/single/privacy-policy"
          className="underline underline-offset-4"
        >
          {t('login.privacy')}
        </Link>
        {t('login.dot')}
      </Label>
    </div>
  );
}
