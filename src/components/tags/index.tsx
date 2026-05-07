import { useEffect, useState } from 'react';

import { Option } from '@/components/multiple-selector';
import type { Resource, TagDto } from '@/interface';

import Tags from './tags';

interface IProps {
  data?: Array<TagDto>;
  namespaceId: string;
  resourceId: string;
  onResource?: (resource: Resource) => void;
  readOnly?: boolean;
}

export default function TagsWrapper(props: IProps) {
  const { data, resourceId, namespaceId, onResource, readOnly } = props;
  const [tags, onTags] = useState<Array<Option>>([]);

  useEffect(() => {
    if (!Array.isArray(data) || data.length <= 0) {
      onTags([]);
      return;
    }
    // Convert TagDto[] directly to Option[] since we already have the tag data
    onTags(data.map((item: TagDto) => ({ label: item.name, value: item.id })));
  }, [data]);

  return (
    <Tags
      data={tags}
      loading={false}
      resourceId={resourceId}
      namespaceId={namespaceId}
      onResource={onResource}
      readOnly={readOnly}
    />
  );
}
