import axios from 'axios';
import { http } from '@/lib/request';
import { useEffect } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

export default function InviteRedirectPage() {
  const navigate = useNavigate();
  const params = useParams();
  const namespaceId = params.namespace_id!;
  const invitationId = params.invitation_id!;

  useEffect(() => {
    const source = axios.CancelToken.source();
    http
      .post(`/namespaces/${namespaceId}/invitations/${invitationId}/accept`, {
        cancelToken: source.token,
      })
      .then(() => {
        navigate(`/${namespaceId}`);
      });
    return () => {
      source.cancel();
    };
  }, []);

  return <Outlet />;
}
