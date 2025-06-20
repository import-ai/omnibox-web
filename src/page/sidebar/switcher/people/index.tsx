import { useParams } from 'react-router-dom';
import { http } from '@/lib/request';
import Table from '../manage';
import Invite from './invite-link';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState } from 'react';

export default function PeopleManage() {
  const params = useParams();
  const namespaceId = params.namespace_id!;

  const [invitationId, setInvitationId] = useState('');
  const refetch = () => {
    http
      .get(`namespaces/${namespaceId}/invitations?type=namespace`)
      .then((data) => {
        if (data.length > 0) {
          setInvitationId(data[0].id);
        } else {
          setInvitationId('');
        }
      });
  };

  useEffect(refetch, []);

  return (
    <div>
      {
        <Invite
          namespaceId={namespaceId}
          invitationId={invitationId}
          refetch={refetch}
        />
      }
      {<Separator className="mb-4" />}
      <Table />
    </div>
  );
}
