import { useTranslation } from 'react-i18next';

export default function About() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b">
        <h3 className="text-lg font-semibold">{t('setting.about_title')}</h3>
      </div>
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
