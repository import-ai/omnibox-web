import { Trash, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import useApp from '@/hooks/use-app';

import { ConfirmPermanentDeleteDialog } from './ConfirmPermanentDeleteDialog';
import { TrashEmpty } from './TrashEmpty';
import { TrashFooter } from './TrashFooter';
import { TrashItemRow } from './TrashItem';
import { TrashSearch } from './TrashSearch';
import { useTrash } from './useTrash';

export function TrashPanel() {
  const { t } = useTranslation();
  const app = useApp();
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [isClearAll, setIsClearAll] = useState(false);

  const {
    items,
    loading,
    total,
    searchValue,
    hasMore,
    setSearchValue,
    loadMore,
    restoreItem,
    permanentlyDelete,
    emptyTrash,
    fetchTrash,
  } = useTrash();

  // Fetch trash on mount to determine icon state
  useEffect(() => {
    fetchTrash('', 0, false);
  }, [fetchTrash]);

  // Fetch trash when popover opens (for refresh)
  useEffect(() => {
    if (open) {
      fetchTrash('', 0, false);
    }
  }, [open, fetchTrash]);

  // Update to monitor sidebar deletion operations
  useEffect(() => {
    return app.on('trash_updated', () => {
      fetchTrash('', 0, false);
    });
  }, [app, fetchTrash]);

  const handleDelete = useCallback((id: string) => {
    setDeleteItemId(id);
    setIsClearAll(false);
    setDeleteDialogOpen(true);
  }, []);

  const handleClearAll = useCallback(() => {
    setDeleteItemId(null);
    setIsClearAll(true);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (isClearAll) {
      emptyTrash();
    } else if (deleteItemId) {
      permanentlyDelete(deleteItemId);
    }
  }, [isClearAll, deleteItemId, emptyTrash, permanentlyDelete]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const bottom =
        target.scrollHeight - target.scrollTop === target.clientHeight;
      if (bottom && hasMore && !loading) {
        loadMore();
      }
    },
    [hasMore, loading, loadMore]
  );

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="h-8 font-normal leading-8 text-neutral-400 pl-4">
          {t('trash.system')}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <SidebarMenuButton>
                    {total > 0 ? (
                      <Trash2 className="size-4 text-neutral-400" />
                    ) : (
                      <Trash className="size-4 text-neutral-400" />
                    )}
                    <span>{t('trash.title')}</span>
                  </SidebarMenuButton>
                </PopoverTrigger>
                <PopoverContent
                  className="w-80 p-3"
                  side="right"
                  align="start"
                  sideOffset={8}
                >
                  <div className="space-y-3">
                    <TrashSearch
                      value={searchValue}
                      onChange={setSearchValue}
                    />

                    <div
                      className="max-h-[300px] overflow-y-auto -mr-3 pr-3"
                      onScroll={handleScroll}
                    >
                      {loading && items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                          <Spinner className="size-6" />
                          <span className="text-sm mt-2">
                            {t('trash.loading')}
                          </span>
                        </div>
                      ) : items.length === 0 ? (
                        <TrashEmpty />
                      ) : (
                        <div className="space-y-1">
                          {items.map(item => (
                            <TrashItemRow
                              key={item.id}
                              item={item}
                              onRestore={restoreItem}
                              onDelete={handleDelete}
                            />
                          ))}
                          {loading && items.length > 0 && (
                            <div className="flex items-center justify-center py-2">
                              <Spinner className="size-4" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <TrashFooter
                      onClearAll={handleClearAll}
                      hasItems={items.length > 0}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <ConfirmPermanentDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isClearAll={isClearAll}
      />
    </>
  );
}
