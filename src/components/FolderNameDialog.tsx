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

interface FolderNameDialogProps {
  open: boolean;
  initialName?: string;
  title?: string;
  confirmText?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (folderName: string) => Promise<unknown>;
}

export function FolderNameDialog({
  open,
  initialName = '',
  title,
  confirmText,
  onOpenChange,
  onConfirm,
}: FolderNameDialogProps) {
  const { t } = useTranslation();
  const [folderName, setFolderName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFolderName(initialName);
    }
  }, [initialName, open]);

  const handleConfirm = async () => {
    if (!folderName.trim() || submitting) {
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(folderName.trim());
      setFolderName('');
      onOpenChange(false);
    } catch {
      // Keep dialog open when request fails.
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (submitting) return;
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
        if (!open && submitting) return;
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
              disabled={submitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={submitting}
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!folderName.trim() || submitting}
            loading={submitting}
          >
            {confirmText || t('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
