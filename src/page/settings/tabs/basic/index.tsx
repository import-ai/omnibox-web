import { useTranslation } from 'react-i18next';

import { Separator } from '@/components/ui/Separator';

import ColorTheme from './ColorTheme';
import Font from './Font';
import Language from './Language';
import Theme from './Theme';

export default function CommonForm() {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex flex-col gap-2.5">
        <h3 className="text-base font-semibold text-foreground">
          {t('setting.preferences')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('setting.basic_description')}
        </p>
      </div>
      <Separator className="my-6" />
      <div className="flex flex-col gap-2">
        <Theme />
        <ColorTheme />
        <Font />
        <Language />
      </div>
    </div>
  );
}
