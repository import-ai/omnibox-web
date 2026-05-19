import ResourceIcon from '@/assets/icons/resourceIcon';
import { normalizeResourceMeta, ResourceMetaLike } from '@/lib/resource-meta';
import { PrivateSearchResourceType } from '@/page/chat/chat-input/types';

interface ResourceTypeIconProps {
  expand?: boolean;
  resource: ResourceMetaLike;
  contextType?: PrivateSearchResourceType;
}

export default function ResourceTypeIcon(props: ResourceTypeIconProps) {
  const { expand = false, resource, contextType } = props;

  return (
    <span className="size-4 shrink-0 [&_svg]:size-4 [&_img]:size-4">
      <ResourceIcon
        expand={expand}
        resource={normalizeResourceMeta(resource, { contextType })}
      />
    </span>
  );
}
