import { Loader2, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { ConfirmPermanentDeleteDialog } from './ConfirmPermanentDeleteDialog';
import { TrashEmpty } from './TrashEmpty';
import { TrashFooter } from './TrashFooter';
import { TrashItemRow } from './TrashItem';
import { TrashSearch } from './TrashSearch';
import { useTrash } from './useTrash';

export function TrashPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [isClearAll, setIsClearAll] = useState(false);

  const {
    items,
    loading,
    searchValue,
    hasMore,
    setSearchValue,
    loadMore,
    restoreItem,
    permanentlyDelete,
    emptyTrash,
    fetchTrash,
  } = useTrash();

  // Fetch trash when popover opens
  useEffect(() => {
    if (open) {
      fetchTrash('', 0, false);
    }
  }, [open, fetchTrash]);

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
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="px-0 size-[32px] [&_svg]:size-[20px] text-[#8F959E] hover:text-[#8F959E] hover:bg-[#E8E8EE]"
              >
                <Trash2 />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{t('trash.title')}</TooltipContent>
        </Tooltip>
        <PopoverContent
          className="w-80 p-3"
          side="top"
          align="start"
          sideOffset={8}
        >
          <div className="space-y-3">
            <TrashSearch value={searchValue} onChange={setSearchValue} />

            <div
              className="max-h-[300px] overflow-y-auto -mx-1"
              onScroll={handleScroll}
            >
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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

      <ConfirmPermanentDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isClearAll={isClearAll}
      />
    </>
  );
}
