import { useTranslation } from 'react-i18next';

import AutoTag from './AutoTag';

export default function Content() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col">
      <h3 className="text-base font-semibold text-foreground">
        {t('setting.feature_management')}
      </h3>
      <div className="mt-3 flex flex-col gap-2">
        <AutoTag />
      </div>
    </div>
  );
}
