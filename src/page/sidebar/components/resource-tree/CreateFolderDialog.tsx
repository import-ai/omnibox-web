import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

interface CreateFolderDialogProps {
  open: boolean;
  initialName?: string;
  title?: string;
  confirmText?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (folderName: string) => Promise<unknown>;
}

export function CreateFolderDialog({
  open,
  initialName = '',
  title,
  confirmText,
  onOpenChange,
  onConfirm,
}: CreateFolderDialogProps) {
  const { t } = useTranslation();
  const [folderName, setFolderName] = useState('');

  useEffect(() => {
    if (open) {
      setFolderName(initialName);
    }
  }, [initialName, open]);

  const handleConfirm = async () => {
    if (!folderName.trim()) {
      return;
    }
    try {
      await onConfirm(folderName.trim());
      setFolderName('');
      onOpenChange(false);
    } catch {
      // Keep dialog open when request fails.
    }
  };

  const handleCancel = () => {
    setFolderName('');
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={open => {
        onOpenChange(open);
        if (!open) setFolderName('');
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title || t('folder.create_dialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="folder-name">
              {t('folder.create_dialog.name')}
            </Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={e => setFolderName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('folder.create_dialog.placeholder')}
              className="border-line"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!folderName.trim()}>
            {confirmText || t('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
