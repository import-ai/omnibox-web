// import { http } from '@/lib/request';
import UnauthorizedPage from './un-auth';

interface IProps {
  resource_id: string;
  namespace_id: string;
  children: React.ReactNode;
}

export default function AuthPage(props: IProps) {
  const { namespace_id, resource_id, children } = props;

  if (!namespace_id || !resource_id) {
    return <UnauthorizedPage />;
  }

  return children;
}
