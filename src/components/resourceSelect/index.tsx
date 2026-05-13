import { ChevronDown, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Resource } from '@/interface';
import each from '@/lib/each';
import { cn } from '@/lib/utils';
import { fetchResource, fetchRootResources } from '@/service/resource';

import { ChooseResource } from './Choose';

interface IProps {
  loading: boolean;
  resourceId: string;
  namespaceId: string;
  className?: string;
  disabledIds?: string[];
  disabledTooltip?: string;
  onChange: (val: string, key?: string) => void;
}

export function ResourceSelect(props: IProps) {
  const {
    className,
    loading,
    namespaceId,
    resourceId,
    disabledIds,
    disabledTooltip,
    onChange,
  } = props;
  const { t } = useTranslation();
  const [open, onOpen] = useState(false);
  const [fetching, onFetching] = useState(false);
  const [data, onData] = useState<Partial<Resource>>({
    id: '',
    name: '',
  });

  const handleOpen = () => {
    onOpen(true);
  };
  const handleChange = (val: string, key?: string) => {
    onChange(val, key);
    onOpen(false);
  };

  useEffect(() => {
    if (loading || !namespaceId || !resourceId) {
      return;
    }
    onFetching(true);
    fetchRootResources(namespaceId)
      .then(root => {
        onFetching(false);
        let match = false;
        each(Object.keys(root), spaceType => {
          const item = root[spaceType];
          if (item.id === resourceId) {
            onData({
              id: resourceId,
              name: spaceType === 'private' ? t('private') : t('teamspace'),
            });
            match = true;
            return true;
          }
          return;
        });
        if (match) {
          return;
        }
        onFetching(true);
        fetchResource(namespaceId, resourceId).then(response => {
          onData({
            id: resourceId,
            name: response.name || t('untitled'),
          });
        });
      })
      .finally(() => {
        onFetching(false);
      });
  }, [t, loading, namespaceId, resourceId]);

  return (
    <DropdownMenu open={open} onOpenChange={onOpen}>
      <DropdownMenuTrigger
        onClick={handleOpen}
        className={cn(
          'flex h-9 min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-0 ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#303030]',
          className
        )}
      >
        <span className="min-w-0 flex-1 max-w-80 truncate text-left text-sm text-neutral-900 dark:text-white">
          {data.name}
        </span>
        {fetching ? (
          <LoaderCircle className="size-4 shrink-0 animate-spin opacity-50 transition-transform" />
        ) : (
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="end"
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border-none dark:bg-neutral-800"
      >
        {open && (
          <ChooseResource
            loading={loading}
            onChange={handleChange}
            namespaceId={namespaceId}
            resourceId={resourceId}
            disabledIds={disabledIds}
            disabledTooltip={disabledTooltip}
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
