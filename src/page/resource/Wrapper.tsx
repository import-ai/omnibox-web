import Loading from '@/components/loading';
import { IUseResource } from '@/hooks/userResource';
import AuthPage from '@/page/auth';

import Page from './Page';

export default function Wrapper(props: IUseResource & { wide: boolean }) {
  const {
    loading,
    forbidden,
    notFound,
    resource,
    editPage,
    onResource,
    namespaceId,
    wide,
  } = props;

  if (loading) {
    return <Loading />;
  }

  return (
    <AuthPage forbidden={forbidden} notFound={notFound} resource={resource}>
      {resource && (
        <Page
          editPage={editPage}
          resource={resource}
          onResource={onResource}
          namespaceId={namespaceId}
          wide={wide}
        />
      )}
    </AuthPage>
  );
}
