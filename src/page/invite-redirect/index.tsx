import axios from 'axios';
import { useEffect } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import { http } from '@/lib/request';

export default function InviteRedirectPage() {
  const navigate = useNavigate();
  const params = useParams();
  const namespaceId = params.namespace_id!;
  const invitationId = params.invitation_id!;

  useEffect(() => {
    const source = axios.CancelToken.source();
    let cancelled = false;

    http
      .post(
        `/namespaces/${namespaceId}/invitations/${invitationId}/accept`,
        undefined,
        {
          cancelToken: source.token,
        }
      )
      .then(() => {
        if (cancelled) return;
        navigate(`/${namespaceId}/chat`);
      });

    return () => {
      cancelled = true;
      source.cancel();
    };
  }, [invitationId, namespaceId, navigate]);

  return <Outlet />;
}
