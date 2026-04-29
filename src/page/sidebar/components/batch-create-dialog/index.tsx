import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SpaceType } from '@/interface';

interface BatchCreateDialogProps {
  open: boolean;
  spaceType: SpaceType;
  onOpenChange: (open: boolean) => void;
  onConfirm: (folderName: string, targetSpaceType: SpaceType) => Promise<void>;
}

export function BatchCreateDialog({
  open,
  spaceType,
  onOpenChange,
  onConfirm,
}: BatchCreateDialogProps) {
  const { t } = useTranslation();
  const [folderName, setFolderName] = useState('');
  const [targetSpaceType, setTargetSpaceType] = useState<SpaceType>(spaceType);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTargetSpaceType(spaceType);
    }
  }, [open, spaceType]);

  const handleConfirm = async () => {
    const trimmed = folderName.trim();
    if (!trimmed) return;
    if (trimmed.length > 128) {
      toast.error(t('batch.name_too_long', { max: 128 }));
      return;
    }

    setLoading(true);
    try {
      await onConfirm(trimmed, targetSpaceType);
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('batch.create_title')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="batch-folder-name">
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
          <div className="flex flex-col gap-2">
            <Label>{t('batch.create_target_label')}</Label>
            <Select
              value={targetSpaceType}
              onValueChange={value => setTargetSpaceType(value as SpaceType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">{t('private')}</SelectItem>
                <SelectItem value="teamspace">{t('teamspace')}</SelectItem>
              </SelectContent>
            </Select>
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
