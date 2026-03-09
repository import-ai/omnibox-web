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
          className={cn('gap-2 p-2', {
            'cursor-pointer': item.id !== currentId,
          })}
          onClick={() => onSelect(item)}
        >
          <div className="flex rounded-[6px] size-6 text-[11px] font-normal items-center justify-center border">
            {item.name.charAt(0).toUpperCase()}
          </div>
          {item.tier ? (
            <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
              <span className="truncate">{item.name}</span>
              {item.expired ? (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {t('namespace.tier.expired')}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
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
