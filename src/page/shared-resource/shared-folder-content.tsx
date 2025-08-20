import axios from 'axios';
import { t } from 'i18next';
import { useEffect, useState } from 'react';

import { http } from '@/lib/request';

interface SharedFolderContentProps {
  shareId: string;
  resourceId: string;
}

export function SharedFolderContent({
  shareId,
  resourceId,
}: SharedFolderContentProps) {
  const [childrenCount, setChildrenCount] = useState(0);

  useEffect(() => {
    const source = axios.CancelToken.source();
    http
      .get(`/shares/${shareId}/resources/${resourceId}/children`, {
        cancelToken: source.token,
      })
      .then(response => {
        setChildrenCount(response?.length || 0);
      })
      .catch(() => {
        setChildrenCount(0);
      });
    return () => {
      source.cancel();
    };
  }, [shareId, resourceId]);

  return (
    <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
      {t('resource.folder.children_count', {
        count: childrenCount,
      })}
    </p>
  );
}
