import Tags from './tags';
import { http } from '@/lib/request';
import { useState, useEffect } from 'react';
import type { Tag } from '@/interface';
import { Option } from '@/components/multiple-selector';

interface IProps {
  data?: Array<string>;
  namespaceId: string;
  resourceId: string;
}

export default function TagsWrapper(props: IProps) {
  const { data, resourceId, namespaceId } = props;
  const [loading, onLoading] = useState(false);
  const [tags, onTags] = useState<Array<Option>>([]);

  useEffect(() => {
    if (!Array.isArray(data) || data.length <= 0) {
      return;
    }
    onLoading(true);
    http
      .get(`/namespaces/${namespaceId}/tag?id=${data.join(',')}`)
      .then((res) => {
        if (res.length <= 0) {
          return;
        }
        onTags(res.map((item: Tag) => ({ label: item.name, value: item.id })));
      })
      .finally(() => {
        onLoading(false);
      });
  }, [data]);

  return (
    <Tags
      data={tags}
      loading={loading}
      resourceId={resourceId}
      namespaceId={namespaceId}
    />
  );
}
