import { useTranslation } from 'react-i18next';

import { type ChatErrorKey, chatErrorKey } from '@/lib/chatErrors';

export default function ChatErrorText({
  error,
  fallback,
  i18nKey,
}: {
  error?: unknown;
  i18nKey?: string;
  fallback?: ChatErrorKey;
}) {
  const { t } = useTranslation();
  return <>{t(i18nKey ?? chatErrorKey(error, fallback))}</>;
}
