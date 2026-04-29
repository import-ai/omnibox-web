import { FolderTree } from 'lucide-react';
import { useState } from 'react';
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
import { useNode } from '@/page/sidebar/store';

import { MoveConfirmDialog } from './move-confirm-dialog';
import { MoveTargetTree } from './move-target-tree';

interface BatchMoveDialogProps {
  open: boolean;
  selectedIds: string[];
  loading?: boolean;
  onConfirm: (targetId: string) => Promise<void>;
  onCancel: () => void;
}

export default function BatchMoveDialog({
  open,
  selectedIds,
  loading = false,
  onConfirm,
  onCancel,
}: BatchMoveDialogProps) {
  const { t } = useTranslation();
  const [targetId, setTargetId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const targetNode = useNode(targetId || '');

  const handleCancel = () => {
    setTargetId(null);
    setConfirmOpen(false);
    onCancel();
  };

  const handleFinalConfirm = async () => {
    if (!targetId) return;
    await onConfirm(targetId);
    setTargetId(null);
    setConfirmOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleCancel}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="size-5" />
              {t('batch.move_title')}
            </DialogTitle>
            <DialogDescription>
              {t('batch.move_description', { count: selectedIds.length })}
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 rounded-md border">
            <ScrollArea className="h-72">
              <MoveTargetTree targetId={targetId} onSelect={setTargetId} />
            </ScrollArea>
          </div>

          {targetId && (
            <div className="mb-4 text-sm text-muted-foreground">
              {t('batch.move_target')}:{' '}
              {targetNode?.name || t(targetNode?.spaceType || 'untitled')}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              {t('cancel')}
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!targetId || loading}
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  {t('moving')}
                </>
              ) : (
                t('batch.move_confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MoveConfirmDialog
        open={confirmOpen}
        count={selectedIds.length}
        targetName={targetNode?.name || t('untitled')}
        onConfirm={handleFinalConfirm}
        onOpenChange={setConfirmOpen}
      />
    </>
  );
}
