import { Resource } from '@/interface';
import Loading from '@/components/loading';
import UnauthorizedPage from '@/page/auth/un-auth';

interface IProps {
  resource: Resource;
  namespace_id: string;
  children: React.ReactNode;
}

export default function AuthPage(props: IProps) {
  const { resource, children } = props;

  if (resource.globalLevel === 'no_access') {
    return <UnauthorizedPage />;
  }

  if (resource.name === 'loading') {
    return <Loading />;
  }

  return children;
}
