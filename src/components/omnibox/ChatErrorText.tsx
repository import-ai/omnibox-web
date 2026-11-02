import { useTranslation } from 'react-i18next';

import { chatErrorKey } from '@/lib/chatErrors';

export default function ChatErrorText({ error }: { error?: unknown }) {
  const { t } = useTranslation();
  return <>{t(chatErrorKey(error))}</>;
}
