import { useTranslation } from 'react-i18next';

import { Separator } from '@/components/ui/Separator';

export default function About() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <div>
      <div className="flex flex-col gap-2.5">
        <h3 className="text-base font-semibold text-foreground">
          {t('setting.about_title')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('setting.about_description')}
        </p>
      </div>
      <Separator className="my-6" />
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {t('setting.copyright', { year: currentYear })}
        </div>
        <div>
          <a
            href="https://github.com/import-ai/omnibox"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            import-ai/omnibox
          </a>
        </div>
      </div>
    </div>
  );
}
