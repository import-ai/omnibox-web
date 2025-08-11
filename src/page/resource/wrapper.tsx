import Loading from '@/components/loading';
import { IUseResource } from '@/hooks/user-resource';
import AuthPage from '@/page/auth';

import Page from './page';

export default function Wrapper(props: IUseResource) {
  const { loading, forbidden, resource, editPage, onResource, namespaceId } =
    props;

  if (loading) {
    return <Loading />;
  }

  return (
    <AuthPage forbidden={forbidden} resource={resource}>
      {resource && (
        <Page
          editPage={editPage}
          resource={resource}
          onResource={onResource}
          namespaceId={namespaceId}
        />
      )}
    </AuthPage>
  );
}
