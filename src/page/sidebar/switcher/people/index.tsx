import axios from 'axios';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Separator } from '@/components/ui/separator';
import { http } from '@/lib/request';

import Table from '../manage';
import Invite from './invite-link';

export default function PeopleManage() {
  const params = useParams();
  const namespaceId = params.namespace_id!;

  const [invitationId, setInvitationId] = useState('');
  const refetch = () => {
    const source = axios.CancelToken.source();
    http
      .get(`namespaces/${namespaceId}/invitations?type=namespace`, {
        cancelToken: source.token,
      })
      .then(data => {
        if (data.length > 0) {
          setInvitationId(data[0].id);
        } else {
          setInvitationId('');
        }
      });
    return () => {
      source.cancel();
    };
  };

  useEffect(refetch, []);

  return (
    <div>
      <Invite
        namespaceId={namespaceId}
        invitationId={invitationId}
        refetch={refetch}
      />
      <Separator className="my-2 lg:my-4" />
      <Table />
    </div>
  );
}
