import Page from './page';
import AuthPage from '@/page/auth';
import { IUseResource } from '@/hooks/user-resource';

export default function Wrapper(props: IUseResource) {
  const { app, resource, resource_id, namespace_id } = props;

  if (!resource) {
    return null;
  }

  return (
    <AuthPage namespace_id={namespace_id} resource={resource}>
      <Page
        app={app}
        resource={resource}
        resource_id={resource_id}
        namespace_id={namespace_id}
      />
    </AuthPage>
  );
}
