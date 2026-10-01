import { Button } from '@/components/Button';
import { Namespace } from '@/interface';

import { NamespaceVersionBadge } from './NamespaceVersionBadge';

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
        <Button
          key={item.id}
          size="default"
          variant="ghost"
          disabled={item.id === currentId}
          className="h-10 w-full justify-start gap-2 rounded-lg px-2 py-2 active:bg-neutral-200 disabled:cursor-default dark:active:bg-neutral-600"
          onClick={() => onSelect(item)}
        >
          <div className="flex size-6 items-center justify-center rounded-md border text-[11px] font-normal">
            {item.name.charAt(0).toUpperCase()}
          </div>
          {item.tier ? (
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span className="truncate">{item.name}</span>
              <NamespaceVersionBadge namespace={item} />
            </div>
          ) : (
            <span className="truncate">{item.name}</span>
          )}
        </Button>
      ))}
    </>
  );
}
