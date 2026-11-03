import { useEffect } from 'react';

import useResource from '@/hooks/userResource';
import { placeLoadingLinkInSidebar } from '@/page/sidebar/placeLoadingLink';

import ResourceDetailView from './ResourceDetailView';

export default function ResourcePage() {
  const props = useResource();

  useEffect(() => {
    placeLoadingLinkInSidebar(props.namespaceId, props.resource);
  }, [props.namespaceId, props.resource]);

  return <ResourceDetailView {...props} />;
}
