import { Permission } from '@/interface';
import UnauthorizedPage from '@/page/auth/un-auth';

interface IProps {
  forbidden: boolean;
  permission?: Permission;
  children: React.ReactNode;
}

export default function AuthPage(props: IProps) {
  const { forbidden, permission, children } = props;

  if (forbidden || permission === 'no_access') {
    return <UnauthorizedPage />;
  }

  return children;
}
