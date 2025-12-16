import { File } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { downloadFile } from '@/lib/download-file';

import { ATTRIBUTE_STYLES } from './constants';

interface FilenameAttributeProps {
  filename: string;
  namespaceId: string;
  resourceId: string;
}

export function FilenameAttribute({
  filename,
  namespaceId,
  resourceId,
}: FilenameAttributeProps) {
  const { t } = useTranslation();
  const [download, onDownload] = useState(false);

  return (
    <div className={ATTRIBUTE_STYLES.container}>
      <div className={ATTRIBUTE_STYLES.containerLabel}>
        <File className={ATTRIBUTE_STYLES.icon} />
        <span className={ATTRIBUTE_STYLES.label}>
          {t('resource.attrs.filename')}
        </span>
      </div>
      <Button
        variant="ghost"
        loading={download}
        className={`font-normal ml-[-16px] ${ATTRIBUTE_STYLES.value}`}
        onClick={() => {
          onDownload(true);
          downloadFile(namespaceId, resourceId, filename).finally(() => {
            onDownload(false);
          });
        }}
      >
        {filename}
      </Button>
    </div>
  );
}
