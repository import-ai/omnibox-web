import { File } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/Button';
import { ImagePreviewDialog } from '@/components/ImagePreviewDialog';
import type { DownloadFileInfo } from '@/interface';
import { downloadFile } from '@/lib/downloadFile';
import { preloadImage } from '@/lib/preloadImage';
import { http } from '@/lib/request';

import { ATTRIBUTE_STYLES } from './constants';

interface FilenameAttributeProps {
  filename: string;
  namespaceId: string;
  resourceId: string;
}

export function FilenameAttribute(props: FilenameAttributeProps) {
  return (
    <FilenameAttributeValue
      key={`${props.namespaceId}/${props.resourceId}/${props.filename}`}
      {...props}
    />
  );
}

function FilenameAttributeValue({
  filename,
  namespaceId,
  resourceId,
}: FilenameAttributeProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const invokerRef = useRef<HTMLButtonElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const handleClick = async () => {
    if (requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    const { signal } = controller;
    setLoading(true);
    try {
      if (!/\.(png|jpe?g)$/i.test(filename)) {
        await downloadFile(namespaceId, resourceId, filename);
        return;
      }

      const fileInfo: DownloadFileInfo = await http.get(
        `/namespaces/${namespaceId}/resources/${resourceId}/file`,
        { signal, timeout: 30_000 }
      );
      if (signal.aborted) return;
      try {
        await preloadImage(fileInfo.url, signal);
      } catch {
        if (!signal.aborted) toast.error(t('chat.image.load_failed'));
        return;
      }
      if (!signal.aborted) setPreviewUrl(fileInfo.url);
    } catch {
      // API failures are reported by the shared request layer.
    } finally {
      if (!signal.aborted) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  };

  return (
    <div className={ATTRIBUTE_STYLES.container}>
      <div className={ATTRIBUTE_STYLES.containerLabel}>
        <File className={ATTRIBUTE_STYLES.icon} />
        <span className={ATTRIBUTE_STYLES.label}>
          {t('resource.attrs.filename')}
        </span>
      </div>
      <Button
        ref={invokerRef}
        variant="ghost"
        loading={loading}
        className={`font-normal ml-[-8px] h-auto py-0 px-2 ${ATTRIBUTE_STYLES.value}`}
        onClick={handleClick}
      >
        {filename}
      </Button>
      <ImagePreviewDialog
        alt={filename}
        src={previewUrl}
        open={!!previewUrl}
        invokerRef={invokerRef}
        onOpenChange={open => {
          if (!open) setPreviewUrl(undefined);
        }}
      />
    </div>
  );
}
