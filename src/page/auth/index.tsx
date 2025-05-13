import { http } from '@/lib/request';
import { Resource } from '@/interface';
import { LoaderCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import UnauthorizedPage from '@/page/auth/un-auth';

interface IProps {
  resource: Resource;
  namespace_id: string;
  children: React.ReactNode;
}

export default function AuthPage(props: IProps) {
  const { resource, namespace_id, children } = props;
  const [access, onAccess] = useState(true);
  const [loading, onLoading] = useState(false);

  useEffect(() => {
    if (!resource || !namespace_id) {
      return;
    }
    onLoading(true);
    // user或者user所在的任何一个组有权限，就可以访问这个资源
    http
      .get(
        `/namespaces/${namespace_id}/resources/${resource.id}/permissions/access`,
      )
      .then((res) => {
        console.log(res);
        onAccess(res);
      })
      .finally(() => {
        onLoading(false);
      });
  }, [resource, namespace_id]);

  if (resource.name === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <LoaderCircle className="transition-transform animate-spin" />
      </div>
    );
  }

  if (!access) {
    return <UnauthorizedPage />;
  }

  return children;
}
