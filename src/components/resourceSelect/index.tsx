import { ChevronDown, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ResourcePickerResource } from '@/components/resourcePicker';
import ResourceTypeIcon from '@/components/ResourceTypeIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import type { PathItem } from '@/interface';
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
  disableSmartFolders?: boolean;
  smartFolderDisabledTooltip?: string;
  onChange: (val: string, key?: string) => void;
}

type SelectedResource = ResourcePickerResource & { path?: PathItem[] };

export function ResourceSelect(props: IProps) {
  const {
    className,
    loading,
    namespaceId,
    resourceId,
    placeholder,
    disabledIds,
    disabledTooltip,
    disableSmartFolders,
    smartFolderDisabledTooltip,
    onChange,
  } = props;
  const { t } = useTranslation();
  const [open, onOpen] = useState(false);
  const [fetching, onFetching] = useState(false);
  const [data, onData] = useState<SelectedResource | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const [triggerWidth, setTriggerWidth] = useState<number>();

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && resourceId && !data && !fetching) {
      setReloadToken(current => current + 1);
    }
    if (nextOpen) {
      setTriggerWidth(triggerRef.current?.getBoundingClientRect().width);
    }
    onOpen(nextOpen);
  };
  const handleChange = (resource: ResourcePickerResource) => {
    requestControllerRef.current?.abort();
    onData(resource);
    onChange(resource.id, 'resourceId');
    onOpen(false);
  };

  useEffect(() => {
    if (loading || !namespaceId) {
      requestControllerRef.current?.abort();
      if (!namespaceId) onData(null);
      onFetching(false);
      return;
    }
    if (!resourceId) {
      requestControllerRef.current?.abort();
      onData(null);
      onFetching(false);
      return;
    }

    const controller = new AbortController();
    requestControllerRef.current?.abort();
    requestControllerRef.current = controller;
    onData(current => (current?.id === resourceId ? current : null));
    onFetching(true);
    fetchRootResources(namespaceId, controller.signal)
      .then(root => {
        if (controller.signal.aborted) return;
        const match = Object.entries(root).find(
          ([, item]) => item.id === resourceId
        );
        if (match) {
          const [spaceType, item] = match;
          const name = spaceType === 'private' ? t('private') : t('teamspace');
          onData({
            ...item,
            name,
            path: [{ id: item.id, name }],
          });
          return;
        }
        return fetchResource(namespaceId, resourceId, controller.signal).then(
          response => {
            if (!controller.signal.aborted) {
              onData({ ...response, name: response.name || t('untitled') });
            }
          }
        );
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          onData(null);
          console.error('Failed to load selected resource', error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) onFetching(false);
      });

    return () => controller.abort();
  }, [t, loading, namespaceId, reloadToken, resourceId]);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!open || !trigger) return;

    const updateWidth = () =>
      setTriggerWidth(trigger.getBoundingClientRect().width);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(trigger);
    return () => observer.disconnect();
  }, [open]);

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        ref={triggerRef}
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
        style={
          triggerWidth
            ? {
                width: triggerWidth,
                minWidth: triggerWidth,
                maxWidth: triggerWidth,
              }
            : undefined
        }
        className="overflow-hidden rounded-xl border border-border shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
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
            disableSmartFolders={disableSmartFolders}
            smartFolderDisabledTooltip={smartFolderDisabledTooltip}
            onChange={handleChange}
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
