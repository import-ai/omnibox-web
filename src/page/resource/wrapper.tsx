import Page from './page';
import AuthPage from '@/page/auth';
import Loading from '@/components/loading';
import { IUseResource } from '@/hooks/user-resource';

export default function Wrapper(props: IUseResource) {
  const { app, loading, forbidden, resource } = props;

  if (loading) {
    return <Loading />;
  }

  return (
    <AuthPage forbidden={forbidden} resource={resource}>
      {resource && <Page app={app} resource={resource} />}
    </AuthPage>
  );
}
