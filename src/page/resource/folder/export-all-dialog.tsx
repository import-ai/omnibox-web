import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { exportAllAsZip, ExportProgress } from '@/lib/export-all';

interface ExportAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  namespaceId: string;
  resourceId: string;
  folderName: string;
}

export function ExportAllDialog(props: ExportAllDialogProps) {
  const { open, onOpenChange, namespaceId, resourceId, folderName } = props;
  const { t } = useTranslation();
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    abortControllerRef.current = new AbortController();

    try {
      await exportAllAsZip(
        namespaceId,
        resourceId,
        folderName,
        setProgress,
        abortControllerRef.current.signal
      );
      toast.success(t('export.success'), { position: 'bottom-right' });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      toast.error(t('export.failed'), { position: 'bottom-right' });
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setIsExporting(false);
    setProgress(null);
    onOpenChange(false);
  };

  const getPhaseText = () => {
    if (!progress) return '';
    switch (progress.phase) {
      case 'fetching':
        return t('export.phase.fetching');
      case 'downloading':
        return t('export.phase.downloading');
      case 'packaging':
        return t('export.phase.packaging');
      case 'complete':
        return t('export.phase.complete');
      case 'error':
        return t('export.phase.error');
      default:
        return '';
    }
  };

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={isExporting ? undefined : onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('export.title')}</DialogTitle>
          <DialogDescription>{t('export.description')}</DialogDescription>
        </DialogHeader>

        {isExporting && progress ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {getPhaseText()}
            </div>
            {progress.total > 0 && (
              <>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="text-sm text-muted-foreground text-center">
                  {t('export.progress', {
                    current: progress.current,
                    total: progress.total,
                  })}
                </div>
              </>
            )}
            {progress.currentItem && (
              <div className="text-sm text-muted-foreground truncate">
                {t('export.current_item', { name: progress.currentItem })}
              </div>
            )}
            {progress.error && (
              <div className="text-sm text-destructive">
                {t('export.error_message', { message: progress.error })}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {t('export.confirm_message', { name: folderName })}
          </div>
        )}

        <DialogFooter>
          {isExporting ? (
            <Button variant="outline" onClick={handleCancel}>
              {t('export.cancel')}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('export.cancel')}
              </Button>
              <Button onClick={handleExport}>{t('export.start')}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
