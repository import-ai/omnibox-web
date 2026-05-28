import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { ResourceSelect } from '@/components/resourceSelect';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useSidebarStore } from '@/page/sidebar/store';
import {
  getDescendantIds,
  getTopLevelSelectedIds,
} from '@/page/sidebar/store/utils';

interface BatchCreateDialogProps {
  open: boolean;
  namespaceId: string;
  defaultTargetId: string;
  selectedIds: string[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (folderName: string, targetId: string) => Promise<boolean | void>;
}

export function BatchCreateDialog({
  open,
  namespaceId,
  defaultTargetId,
  selectedIds,
  onOpenChange,
  onConfirm,
}: BatchCreateDialogProps) {
  const { t } = useTranslation();
  const [folderName, setFolderName] = useState('');
  const [targetId, setTargetId] = useState(defaultTargetId);
  const [loading, setLoading] = useState(false);
  const nodes = useSidebarStore(state => state.nodes);
  const disabledTargetIds = useMemo(() => {
    const topLevelSelectedIds = getTopLevelSelectedIds(nodes, selectedIds);
    return topLevelSelectedIds.flatMap(id => [
      id,
      ...getDescendantIds(nodes, id),
    ]);
  }, [nodes, selectedIds]);

  useEffect(() => {
    if (open) {
      setTargetId(defaultTargetId);
    }
  }, [defaultTargetId, open]);

  const handleConfirm = async () => {
    const trimmed = folderName.trim();
    if (!trimmed || !targetId) return;
    if (trimmed.length > 128) {
      toast.error(t('batch.name_too_long', { max: 128 }), {
        position: 'bottom-right',
      });
      return;
    }

    setLoading(true);
    try {
      const shouldClose = await onConfirm(trimmed, targetId);
      if (shouldClose === false) return;
      setFolderName('');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFolderName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover w-[480px] max-w-[90%]">
        <DialogHeader>
          <DialogTitle>{t('batch.create_tooltip')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="batch-folder-name" className="min-w-12">
              {t('batch.create_name_label')}
            </Label>
            <Input
              id="batch-folder-name"
              value={folderName}
              onChange={event => setFolderName(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  handleConfirm();
                }
              }}
              placeholder={t('batch.create_placeholder')}
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="min-w-12">{t('batch.create_target_label')}</Label>
            <ResourceSelect
              namespaceId={namespaceId}
              resourceId={targetId}
              disabledIds={disabledTargetIds}
              disabledTooltip={t('batch.operating_resource')}
              loading={loading}
              onChange={setTargetId}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!folderName.trim() || loading}
          >
            {t('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
