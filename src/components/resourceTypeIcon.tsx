import ResourceIcon from '@/assets/icons/resourceIcon';
import { normalizeResourceMeta, ResourceMetaLike } from '@/lib/resourceMeta';
import { PrivateSearchResourceType } from '@/page/chat/chat-input/types';

interface ResourceTypeIconProps {
  expand?: boolean;
  resource: ResourceMetaLike;
  contextType?: PrivateSearchResourceType;
}

export default function ResourceTypeIcon(props: ResourceTypeIconProps) {
  const { expand = false, resource, contextType } = props;

  return (
    <ResourceIcon
      expand={expand}
      resource={normalizeResourceMeta(resource, { contextType })}
    />
  );
}
