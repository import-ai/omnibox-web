import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/omnibox/Dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/Label';
import { beginEditorInput } from '@/lib/behaviorRequest';
import { useBehaviorSurface } from '@/lib/behaviorTracking';
import { overlayCloseName } from '@/lib/trackButtonClick';

interface FolderNameDialogProps {
  open: boolean;
  initialName?: string;
  resourceId?: string;
  title?: string;
  confirmText?: string;
  cancelTrackName?: string;
  confirmTrackName?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (folderName: string) => Promise<unknown>;
}

export function FolderNameDialog({
  open,
  initialName = '',
  resourceId,
  title,
  confirmText,
  cancelTrackName,
  confirmTrackName,
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
      <DialogContent
        closeDisabled={submitting}
        className="sm:max-w-[425px]"
        outsideCloseTrackName={
          confirmTrackName
            ? overlayCloseName(confirmTrackName, 'sidebar')
            : undefined
        }
        outsideCloseTarget={confirmTrackName ? 'folder' : undefined}
      >
        <DialogHeader>
          <DialogTitle>{title || t('folder.create_dialog.title')}</DialogTitle>
        </DialogHeader>
        <FolderEditSurface open={open} resourceId={resourceId}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="folder-name">
              {t('folder.create_dialog.name')}
            </Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={e => {
                setFolderName(e.target.value);
                if (resourceId) beginEditorInput(resourceId);
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('folder.create_dialog.placeholder')}
              className="border-line"
              autoFocus
              disabled={submitting}
            />
          </div>
        </FolderEditSurface>
        <DialogFooter>
          <Button
            variant="outline"
            trackName={cancelTrackName}
            onClick={handleCancel}
            disabled={submitting}
          >
            {t('cancel')}
          </Button>
          <Button
            trackName={confirmTrackName}
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

function FolderEditSurface({
  open,
  resourceId,
  children,
}: {
  open: boolean;
  resourceId?: string;
  children: ReactNode;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  useBehaviorSurface({
    scope: 'editor',
    target: 'resource_detail',
    active: open && !!resourceId,
    elementRef: editorRef,
    props: { resource_id: resourceId, resource_type: 'folder' },
  });
  return (
    <div ref={editorRef} className="flex flex-col gap-4 py-4">
      {children}
    </div>
  );
}
