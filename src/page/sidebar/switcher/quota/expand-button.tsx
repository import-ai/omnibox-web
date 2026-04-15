import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import useProNamespaces from '@/hooks/use-pro-namespaces';
import { NamespaceTier } from '@/interface';

interface ExpandButtonProps {
  namespaceId: string;
}

export function ExpandButton({ namespaceId }: ExpandButtonProps) {
  const { t, i18n } = useTranslation();
  const { data } = useProNamespaces();

  const currentNamespace = data.find(item => item.id === namespaceId);

  if (
    !currentNamespace ||
    currentNamespace.tier !== NamespaceTier.BASIC ||
    !currentNamespace.is_owner
  ) {
    return null;
  }

  return (
    <div className="flex justify-end">
      <a
        href={`/${i18n.language === 'en-US' ? 'en' : 'zh-cn'}/pricing`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button
          size="sm"
          variant="default"
          className="h-8 w-20 shrink-0 text-xs font-medium"
        >
          {t('quota.expand_button')}
        </Button>
      </a>
    </div>
  );
}
