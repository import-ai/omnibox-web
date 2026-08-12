import { Navigate, useParams } from 'react-router-dom';

/**
 * RSS items used to live under their folder (`.../:resourceId/rss-items/:itemId`)
 * and were addressed by the primary key of the dropped `rss_items` table. Items
 * are ordinary resources now, minted with fresh ids, so that old id identifies
 * nothing: send the visitor to the folder, which is still there and still lists
 * the article.
 */
export default function RssItemRedirect() {
  const {
    namespace_id: namespaceId,
    share_id: shareId,
    resource_id: resourceId,
  } = useParams();

  const base = shareId ? `/s/${shareId}` : `/${namespaceId}`;

  return <Navigate replace to={`${base}/${resourceId}`} />;
}
