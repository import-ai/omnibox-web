import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { Separator } from '@/components/ui/Separator';
import { http } from '@/lib/request';
import Table from '@/page/settings/tabs/members';

import Invite from './InvitePeople';

interface PeopleManageProps {
  canManageMembers: boolean;
}

export default function PeopleManage({ canManageMembers }: PeopleManageProps) {
  const params = useParams();
  const { t } = useTranslation();
  const namespaceId = params.namespace_id!;

  const [invitationId, setInvitationId] = useState('');
  const refetch = () => {
    if (!canManageMembers) {
      return;
    }
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

  useEffect(refetch, [canManageMembers, namespaceId]);

  return (
    <div>
      <div className="flex flex-col gap-2.5">
        <h3 className="text-base font-semibold text-foreground">
          {t('setting.members')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('manage.description')}
        </p>
      </div>
      <Separator className="my-6" />
      {canManageMembers && (
        <>
          <Invite
            namespaceId={namespaceId}
            invitationId={invitationId}
            refetch={refetch}
          />
          <Separator className="my-2 lg:my-4" />
        </>
      )}
      <Table canManageMembers={canManageMembers} />
    </div>
  );
}
