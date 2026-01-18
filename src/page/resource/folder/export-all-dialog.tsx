import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Spinner } from '@/components/ui/spinner';
import {
  exportAllAsZipBackend,
  ExportProgress,
} from '@/lib/export-all-backend';

interface ExportAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  namespaceId: string;
  resourceId: string;
  folderName: string;
}

export function ExportAllDialog({
  open,
  onOpenChange,
  namespaceId,
  resourceId,
  folderName,
}: ExportAllDialogProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleExport = useCallback(async () => {
    if (isExporting) {
      return;
    }
    setIsExporting(true);
    setProgress(null);
    abortControllerRef.current = new AbortController();

    try {
      await exportAllAsZipBackend(
        namespaceId,
        resourceId,
        folderName,
        setProgress,
        abortControllerRef.current.signal
      );
      onOpenChange(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setProgress(null);
      }
    } finally {
      setIsExporting(false);
      abortControllerRef.current = null;
    }
  }, [namespaceId, resourceId, folderName, onOpenChange, isExporting]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      handleExport();
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [open, handleExport]);

  const getStatusText = () => {
    if (!progress) return t('export.starting');
    switch (progress.phase) {
      case 'fetching':
        return t('export.fetching');
      case 'processing':
        return progress.total > 0
          ? t('export.processing_count', {
              current: progress.current,
              total: progress.total,
            })
          : t('export.processing');
      case 'downloading':
        return t('export.downloading');
      case 'complete':
        return t('export.complete');
      case 'error':
        if (progress.error === 'EXPORT_TIMEOUT') {
          return t('export.timeout');
        }
        if (progress.error === 'EXPORT_CANCELED') {
          return t('export.canceled');
        }
        return progress.error || t('export.error');
      default:
        return t('export.processing');
    }
  };

  const getProgressPercent = () => {
    if (!progress || progress.total === 0) return 0;
    return Math.round((progress.current / progress.total) * 100);
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('export.title')}</DialogTitle>
          <DialogDescription>{t('export.description')}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center gap-3">
            {isExporting && progress?.phase !== 'error' && (
              <Spinner className="size-5" />
            )}
            <span className="text-sm">{getStatusText()}</span>
          </div>

          {progress &&
            progress.total > 0 &&
            progress.phase === 'processing' && (
              <div className="mt-3">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${getProgressPercent()}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {getProgressPercent()}%
                </p>
              </div>
            )}
        </div>

        <DialogFooter>
          {progress?.phase === 'error' ? (
            <>
              <Button onClick={handleExport}>{t('common.retry')}</Button>
              <Button variant="outline" onClick={handleCancel}>
                {t('cancel')}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleCancel}>
              {t('cancel')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
