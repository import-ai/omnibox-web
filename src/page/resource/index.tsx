import { useParams } from 'react-router-dom';

import useResource from '@/hooks/userResource';

import ResourceDetailView from './ResourceDetailView';

export default function ResourcePage() {
  const props = useResource();
  const { rss_item_id: rssItemId } = useParams();

  return <ResourceDetailView {...props} rssItemId={rssItemId ?? null} />;
}
