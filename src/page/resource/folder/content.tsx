import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { http } from '@/lib/request';

interface IProps {
  resource: { id: string };
  apiPrefix: string;
  namespaceId: string;
}

export function FolderContent(props: IProps) {
  const { resource, apiPrefix, namespaceId } = props;
  const { t } = useTranslation();
  const [childrenCount, setChildrenCount] = useState(0);

  useEffect(() => {
    const source = axios.CancelToken.source();
    const childrenApiPath = `${apiPrefix}/${resource.id}/children?summary=true`;

    http
      .get(childrenApiPath, {
        cancelToken: source.token,
      })
      .then((response: { length: number }) => {
        setChildrenCount(response.length);
      });
    return () => {
      source.cancel();
    };
  }, [apiPrefix, namespaceId, resource.id, resource.resource_type]);

  return (
    <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
      {t('resource.folder.children_count', {
        count: childrenCount,
      })}
    </p>
  );
}
