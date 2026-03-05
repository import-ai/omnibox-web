import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { UpgradeIcon } from '@/assets/icons/upgrade';
import useProNamespaces from '@/hooks/use-pro-namespaces';
import { NamespaceTier } from '@/interface';
import { cn } from '@/lib/utils';

export function UpgradeButton() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const namespaceId = params.namespace_id;
  const { data } = useProNamespaces();

  const currentNamespace = data.find(item => item.id === namespaceId);
  if (!currentNamespace || currentNamespace.tier !== NamespaceTier.BASIC) {
    return null;
  }

  const handleClick = () => {
    const rawLang = i18n.language || 'zh-cn';
    const lang = rawLang.startsWith('zh') ? 'zh-cn' : 'en';
    window.open(`/${lang}/pricing?namespace=${namespaceId}`, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex h-[30px] w-auto lg:w-full items-center gap-3 rounded px-3 text-left',
        'hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
      )}
    >
      <UpgradeIcon className="size-4 shrink-0 text-blue-500" />
      <span className="whitespace-nowrap text-sm font-medium text-blue-500">
        {t('namespace.upgrade')}
      </span>
    </button>
  );
}
