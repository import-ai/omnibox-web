import { Resource } from '@/interface';
import UnauthorizedPage from '@/page/auth/un-auth';

interface IProps {
  forbidden: boolean;
  resource: Resource;
  children: React.ReactNode;
}

export default function AuthPage(props: IProps) {
  const { forbidden, resource, children } = props;

  if (forbidden || resource.globalLevel === 'no_access') {
    return <UnauthorizedPage />;
  }

  return children;
}
