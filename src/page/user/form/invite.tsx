import { http } from '@/utils/request';
import { useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { toDefaultNamespace } from '@/utils/namespace';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function InviteForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const userId = params.get('user');
  const namespaceId = params.get('namespace');
  const [data, onData] = useState<{
    namespace: string;
    username: string;
  }>({
    namespace: '--',
    username: '--',
  });
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = () => {
    setIsLoading(true);
    http
      .post('invite/confirm', { token })
      .then(() => {
        toDefaultNamespace(navigate, { replace: true });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (!namespaceId || !userId) {
      return;
    }
    Promise.all(
      [`namespaces/${namespaceId}`, `user/${userId}`].map((uri) =>
        http.get(uri)
      )
    ).then(([namespace, user]) => {
      onData({
        namespace: namespace.name,
        username: user.username,
      });
    });
  }, []);

  if (!token || !namespaceId || !userId) {
    return (
      <div className="text-center text-sm">
        <p>Invalid request parameters</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        {data.username} invites you to join {data.namespace}
      </div>
      <Button
        type="submit"
        className="w-full"
        loading={isLoading}
        onClick={handleSubmit}
      >
        Send Invitation
      </Button>
    </div>
  );
}
