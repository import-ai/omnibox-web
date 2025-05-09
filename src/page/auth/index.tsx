import UnauthorizedPage from './un-auth';
import useResourcePermissions from '@/hooks/use-resource-permissions';

interface IProps {
  resource_id: string;
  namespace_id: string;
  children: React.ReactNode;
}

export default function AuthPage(props: IProps) {
  const { resource_id, children } = props;
  const permission = useResourcePermissions({ resource_id });

  if (permission.noAccess || !permission.read) {
    return <UnauthorizedPage />;
  }

  return children;
}
