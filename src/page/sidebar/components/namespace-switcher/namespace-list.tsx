import { useTranslation } from 'react-i18next';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Namespace } from '@/interface';
import { cn } from '@/lib/utils';

interface NamespaceListProps {
  namespaces: Namespace[];
  currentId: string;
  onSelect: (item: Namespace) => void;
}

export function NamespaceList({
  namespaces,
  currentId,
  onSelect,
}: NamespaceListProps) {
  const { t } = useTranslation();

  return (
    <>
      {namespaces.map(item => (
        <DropdownMenuItem
          key={item.id}
          disabled={item.id === currentId}
          className={cn(
            'gap-2 px-2 py-2 rounded-[8px] active:bg-neutral-200 dark:active:bg-neutral-600',
            {
              'cursor-pointer': item.id !== currentId,
            }
          )}
          onClick={() => onSelect(item)}
        >
          <div className="flex size-6 items-center justify-center rounded-[6px] border text-[11px] font-normal">
            {item.name.charAt(0).toUpperCase()}
          </div>
          {item.tier ? (
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span className="truncate">{item.name}</span>
              {item.expired ? (
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {t('namespace.tier.expired')}
                </span>
              ) : (
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {t(`namespace.tier.${item.tier}`)}
                </span>
              )}
            </div>
          ) : (
            <span className="truncate">{item.name}</span>
          )}
        </DropdownMenuItem>
      ))}
    </>
  );
}
