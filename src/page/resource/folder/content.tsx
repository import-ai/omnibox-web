import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ResourceMeta } from '@/interface';
import { http } from '@/lib/request';

interface IProps {
  resource: ResourceMeta;
  apiPrefix: string;
}

export function FolderContent(props: IProps) {
  const { resource, apiPrefix } = props;
  const { t } = useTranslation();
  const [childrenCount, setChildrenCount] = useState(0);

  useEffect(() => {
    const source = axios.CancelToken.source();
    http
      .get(`${apiPrefix}/${resource.id}/children`, {
        cancelToken: source.token,
      })
      .then(response => {
        setChildrenCount(response.length);
      });
    return () => {
      source.cancel();
    };
  }, [apiPrefix, resource.id]);

  return (
    <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
      {t('resource.folder.children_count', {
        count: childrenCount,
      })}
    </p>
  );
}
