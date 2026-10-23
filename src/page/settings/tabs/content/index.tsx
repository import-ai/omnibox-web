import { useTranslation } from 'react-i18next';

import { Separator } from '@/components/ui/Separator';

import AutoTag from './AutoTag';

export default function Content() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2.5">
        <h3 className="text-base font-semibold text-foreground">
          {t('setting.feature_management')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('setting.content_description')}
        </p>
      </div>
      <Separator className="my-6" />
      <div className="flex flex-col gap-2">
        <AutoTag />
      </div>
    </div>
  );
}
