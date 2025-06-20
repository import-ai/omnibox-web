import Page from './page';
import AuthPage from '@/page/auth';
import Loading from '@/components/loading';
import { IUseResource } from '@/hooks/user-resource';

export default function Wrapper(props: IUseResource) {
  const { loading, forbidden, resource, editPage, onResource } = props;

  if (loading) {
    return <Loading />;
  }

  return (
    <AuthPage forbidden={forbidden} resource={resource}>
      {resource && (
        <Page editPage={editPage} resource={resource} onResource={onResource} />
      )}
    </AuthPage>
  );
}
