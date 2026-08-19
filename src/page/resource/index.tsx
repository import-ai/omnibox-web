import useResource from '@/hooks/userResource';

import ResourceDetailView from './ResourceDetailView';

export default function ResourcePage() {
  const props = useResource();

  return <ResourceDetailView {...props} />;
}
