import { Resource } from '@/interface';
import UnauthorizedPage from '@/page/auth/un-auth';

interface IProps {
  forbidden: boolean;
  resource: Resource | null;
  children: React.ReactNode;
}

export default function AuthPage(props: IProps) {
  const { forbidden, resource, children } = props;

  if (forbidden) {
    return <UnauthorizedPage />;
  }

  if (!resource) {
    return null;
  }

  if (resource.current_level === 'no_access') {
    return <UnauthorizedPage />;
  }

  return children;
}
