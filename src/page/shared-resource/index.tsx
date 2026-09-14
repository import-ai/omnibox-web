import { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

import Loading from '@/components/loading';
import { Resource } from '@/interface';
import { setDocumentTitle } from '@/lib/utils';
import DeletedResourcePage from '@/page/auth/DeletedResourcePage';
import Page from '@/page/resource/Page';

import { useShareContext } from '../share';

export default function SharedResourcePage() {
  const { notFound, shareInfo, resource, wide } = useShareContext();
  const { showToc = true } = useOutletContext<{ showToc?: boolean }>() ?? {};

  useEffect(() => {
    if (resource?.name) {
      setDocumentTitle(resource.name);
    }
  }, [resource?.name]);

  if (notFound) {
    return <DeletedResourcePage />;
  }

  if (!shareInfo || !resource) {
    return <Loading />;
  }

  return (
    <Page
      editPage={false}
      resource={resource as Resource}
      namespaceId={shareInfo.id}
      showToc={showToc}
      wide={wide}
      readOnly
      apiPrefix={`/shares/${shareInfo.id}/resources`}
      navigationPrefix={`/s/${shareInfo.id}`}
    />
  );
}
