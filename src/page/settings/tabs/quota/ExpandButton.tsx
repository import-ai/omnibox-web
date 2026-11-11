import { useTranslation } from 'react-i18next';

import { SettingPageButton } from '@/components/omnibox/SettingPageButton';
import useProNamespaces from '@/hooks/useProNamespaces';
import { getUpgradeLink } from '@/lib/upgradeLink';

interface ExpandButtonProps {
  namespaceId: string;
}

export function ExpandButton({ namespaceId }: ExpandButtonProps) {
  const { t, i18n } = useTranslation();
  const { data } = useProNamespaces();

  const currentNamespace = data.find(item => item.id === namespaceId);

  if (!currentNamespace || !currentNamespace.is_owner) {
    return <div className="h-1" />;
  }

  return (
    <div className="flex justify-end">
      <a
        href={getUpgradeLink(i18n, namespaceId, 'settings_usage')}
        target="_blank"
        rel="noopener noreferrer"
      >
        <SettingPageButton>{t('quota.expand_button')}</SettingPageButton>
      </a>
    </div>
  );
}
