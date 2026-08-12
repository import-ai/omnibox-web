import { Navigate, useParams } from 'react-router-dom';

/**
 * RSS items used to live under their folder (`.../:resourceId/rss-items/:itemId`).
 * They are ordinary resources now, so old links resolve to the generic resource
 * route for the item itself.
 */
export default function RssItemRedirect() {
  const {
    namespace_id: namespaceId,
    share_id: shareId,
    rss_item_id: rssItemId,
    resource_id: resourceId,
  } = useParams();

  const base = shareId ? `/s/${shareId}` : `/${namespaceId}`;
  const targetId = rssItemId || resourceId;

  return <Navigate replace to={`${base}/${targetId}`} />;
}
