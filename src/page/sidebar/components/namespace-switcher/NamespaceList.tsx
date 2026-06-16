import { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Namespace } from '@/interface';
import { cn } from '@/lib/utils';

import { NamespaceTierBadge } from './NamespaceTierBadge';

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
  return (
    <>
      {namespaces.map(item => (
        <DropdownMenuItem
          key={item.id}
          disabled={item.id === currentId}
          className={cn(
            'gap-2 rounded-lg px-2 py-2 active:bg-neutral-200 dark:active:bg-neutral-600',
            {
              'cursor-pointer': item.id !== currentId,
            }
          )}
          onClick={() => onSelect(item)}
        >
          <div className="flex size-6 items-center justify-center rounded-md border text-[11px] font-normal">
            {item.name.charAt(0).toUpperCase()}
          </div>
          {item.tier ? (
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span className="truncate">{item.name}</span>
              <NamespaceTierBadge namespace={item} />
            </div>
          ) : (
            <span className="truncate">{item.name}</span>
          )}
        </DropdownMenuItem>
      ))}
    </>
  );
}
