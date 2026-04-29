import { AlertTriangle, File, Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import type { TreeNode } from '@/page/sidebar/store';

interface BatchDeleteDialogProps {
  open: boolean;
  selectedIds: string[];
  nodes: Record<string, TreeNode>;
  loading?: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function BatchDeleteDialog({
  open,
  selectedIds,
  nodes,
  loading = false,
  onConfirm,
  onCancel,
}: BatchDeleteDialogProps) {
  const { t } = useTranslation();
  const selectedNodes = selectedIds
    .map(id => nodes[id])
    .filter((node): node is TreeNode => Boolean(node));
  const visibleNodes = selectedNodes.slice(0, 10);
  const remainingCount = Math.max(
    0,
    selectedNodes.length - visibleNodes.length
  );

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            {t('batch.delete_title')}
          </DialogTitle>
          <DialogDescription>
            {t('batch.delete_description', { count: selectedIds.length })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="my-4 max-h-60">
          <div className="space-y-2">
            {visibleNodes.map(node => {
              const Icon = node.resourceType === 'folder' ? Folder : File;
              return (
                <div
                  key={node.id}
                  className="flex items-center gap-2 rounded-md bg-muted/50 p-2"
                >
                  <Icon className="size-4 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">
                    {node.name || t('untitled')}
                  </span>
                </div>
              );
            })}
            {remainingCount > 0 && (
              <div className="py-2 text-center text-sm text-muted-foreground">
                {t('batch.and_more', { count: remainingCount })}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <Spinner className="mr-2 size-4" />
                {t('deleting')}
              </>
            ) : (
              t('batch.delete_confirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
