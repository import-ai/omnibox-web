import { useTranslation } from 'react-i18next';

import { SUPPORTED_EMAIL_DOCS_LINK } from '@/const';
import { getDocsLink } from '@/lib/get-docs-link';
import { cn } from '@/lib/utils';

interface SupportedEmailLinkProps {
  className?: string;
}

export function SupportedEmailLink({ className }: SupportedEmailLinkProps) {
  const { t, i18n } = useTranslation();

  return (
    <a
      href={getDocsLink(SUPPORTED_EMAIL_DOCS_LINK, i18n.language)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('hover:underline', className)}
    >
      {t('form.supported_email_providers')}
    </a>
  );
}
