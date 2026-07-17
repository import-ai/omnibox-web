import { ChevronDown, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ResourcePickerResource } from '@/components/resourcePicker';
import ResourceTypeIcon from '@/components/ResourceTypeIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import type { Resource } from '@/interface';
import { cn } from '@/lib/utils';
import { fetchResource, fetchRootResources } from '@/service/resource';

import { ChooseResourceTree } from './ChooseResourceTree';

interface IProps {
  loading: boolean;
  resourceId: string;
  namespaceId: string;
  placeholder?: string;
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
    placeholder,
    disabledIds,
    disabledTooltip,
    onChange,
  } = props;
  const { t } = useTranslation();
  const [open, onOpen] = useState(false);
  const [fetching, onFetching] = useState(false);
  const [data, onData] = useState<Resource | null>(null);

  const handleOpen = () => {
    onOpen(true);
  };
  const handleChange = (resource: ResourcePickerResource) => {
    onData(resource);
    onChange(resource.id, 'resourceId');
    onOpen(false);
  };

  useEffect(() => {
    if (loading || !namespaceId) {
      return;
    }
    if (!resourceId) {
      onData(null);
      return;
    }
    onFetching(true);
    fetchRootResources(namespaceId)
      .then(root => {
        const match = Object.entries(root).find(
          ([, item]) => item.id === resourceId
        );
        if (match) {
          const [spaceType, item] = match;
          onData({
            ...item,
            name: spaceType === 'private' ? t('private') : t('teamspace'),
          });
          return;
        }
        return fetchResource(namespaceId, resourceId).then(response => {
          onData({ ...response, name: response.name || t('untitled') });
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
          'flex h-9 min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#303030]',
          className
        )}
      >
        {data && <ResourceTypeIcon resource={data} />}
        <span className="min-w-0 flex-1 truncate text-left text-sm text-neutral-900 dark:text-white">
          {data?.name || placeholder}
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
        onCloseAutoFocus={event => {
          event.preventDefault();
        }}
        onOpenAutoFocus={event => {
          event.preventDefault();
        }}
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[var(--radix-dropdown-menu-trigger-width)] overflow-hidden rounded-xl border border-border shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
      >
        {open && (
          <ChooseResourceTree
            namespaceId={namespaceId}
            resourceId={resourceId}
            selectedResourcePath={
              data?.id === resourceId ? data.path : undefined
            }
            disabledIds={disabledIds}
            disabledTooltip={disabledTooltip}
            onChange={handleChange}
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
