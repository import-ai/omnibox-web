import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Resource } from '@/interface';
import { http } from '@/lib/request';

interface IProps {
  resource: Resource;
  namespaceId: string;
}

export function FolderContent(props: IProps) {
  const { resource, namespaceId } = props;
  const { t } = useTranslation();
  const [childrenCount, setChildrenCount] = useState(0);

  useEffect(() => {
    const source = axios.CancelToken.source();
    http
      .get(`/namespaces/${namespaceId}/resources/${resource.id}/children`, {
        cancelToken: source.token,
      })
      .then(response => {
        setChildrenCount(response.length);
      });
    return () => {
      source.cancel();
    };
  }, [namespaceId, resource.id]);

  return (
    <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
      {t('resource.folder.children_count', {
        count: childrenCount,
      })}
    </p>
  );
}
