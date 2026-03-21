import { Resource } from '@/interface';
import DeletedResourcePage from '@/page/auth/deleted-resource';
import UnauthorizedPage from '@/page/auth/un-auth';

interface IProps {
  forbidden: boolean;
  notFound: boolean;
  resource: Resource | null;
  children: React.ReactNode;
}

export default function AuthPage(props: IProps) {
  const { forbidden, notFound, resource, children } = props;

  if (forbidden) {
    return <UnauthorizedPage />;
  }

  if (notFound) {
    return <DeletedResourcePage />;
  }

  if (!resource) {
    return null;
  }

  if (resource.current_permission === 'no_access') {
    return <UnauthorizedPage />;
  }

  return children;
}
