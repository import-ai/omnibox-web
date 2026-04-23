import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { Input } from '@/components/input';
import Invite from '@/components/invite-dialog';
import PermissionAction from '@/components/permission-action';
import UserCard from '@/components/user-card';
import { Member, Role } from '@/interface';
import { http } from '@/lib/request';

import Action from './member-actions';

// Role hierarchy levels: lower number = higher privilege
const ROLE_LEVEL: Record<Role, number> = {
  owner: 0,
  admin: 1,
  member: 2,
};

interface MemberProps {
  search: string;
  refetch: () => void;
  data: Array<Member>;
  namespace_id: string;
  namespaceName?: string;
  onSearch: (value: string) => void;
}

export default function MemberMain(props: MemberProps) {
  const { search, data, namespace_id, namespaceName, refetch, onSearch } =
    props;
  const { t } = useTranslation();
  const uid = localStorage.getItem('uid');
  const [resourceId, onResourceId] = useState('');
  const currentUserMember = data.find(item => item.user_id === uid);
  const currentUserRole = currentUserMember?.role;
  const isOwnerOrAdmin =
    currentUserRole === 'owner' || currentUserRole === 'admin';

  useEffect(() => {
    const source = axios.CancelToken.source();
    http
      .get(`/namespaces/${namespace_id}/root?namespace_id=${namespace_id}`, {
        cancelToken: source.token,
      })
      .then(res => {
        onResourceId(res.teamspace.id);
      });
    return () => {
      source.cancel();
    };
  }, [namespace_id]);

  return (
    <div className="space-y-2 lg:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={t('manage.search')}
          className="h-7 w-[150px] rounded-md border-border bg-transparent text-sm placeholder:text-muted-foreground dark:bg-transparent lg:h-9 lg:w-[435px]"
        />
        <Invite onFinish={refetch}>
          <Button
            variant="default"
            className="h-[30px] w-[71px] shrink-0 text-xs font-medium"
          >
            {t('manage.add')}
          </Button>
        </Invite>
      </div>
      <div className="max-w-[83vw] overflow-auto sm:max-w-full">
        <div className="min-w-[320px]">
          <div className="sticky top-0 z-10 flex w-full border-b border-border bg-background">
            <div className="flex h-8 w-[120px] items-center whitespace-nowrap px-2 text-sm font-medium text-foreground lg:h-10 lg:w-[210px] lg:text-base">
              {t('manage.user')}
            </div>
            <div className="flex h-8 w-[90px] items-center whitespace-nowrap px-2 text-sm font-medium text-foreground lg:h-10 lg:w-[124px] lg:text-base">
              {t('manage.permission')}
            </div>
            <div className="flex h-8 w-[90px] items-center whitespace-nowrap px-2 text-sm font-medium text-foreground lg:h-10 lg:w-[127px] lg:text-base">
              {t('manage.role')}
            </div>
          </div>
          <div className="w-full text-sm">
            {data.map(item => {
              // Check if current user can modify target based on role hierarchy
              const currentLevel = ROLE_LEVEL[currentUserRole ?? 'member'];
              const targetLevel = ROLE_LEVEL[item.role];
              const canModifyTarget =
                currentUserRole === 'owner' || currentLevel < targetLevel;

              return (
                <div
                  key={item.user_id}
                  className="flex h-[50px] items-center border-b border-border lg:h-[60px]"
                >
                  <div className="w-[120px] whitespace-nowrap px-2 lg:w-[210px]">
                    <UserCard
                      email={item.email || ''}
                      username={item.username}
                    />
                  </div>
                  <div className="w-[90px] whitespace-nowrap px-2 lg:w-[124px]">
                    <PermissionAction
                      disabled={!isOwnerOrAdmin || !canModifyTarget}
                      value={item.permission}
                      refetch={refetch}
                      user_id={item.user_id}
                      resource_id={resourceId}
                      namespace_id={namespace_id}
                      canRemove={false}
                      canNoAccess={true}
                    />
                  </div>
                  <div className="w-[90px] whitespace-nowrap px-2 lg:w-[127px]">
                    <Action
                      disabled={!isOwnerOrAdmin}
                      id={item.user_id}
                      value={item.role}
                      currentUserRole={currentUserRole}
                      targetUsername={item.username}
                      refetch={refetch}
                      namespace_id={namespace_id}
                      namespaceName={namespaceName}
                      hasOwner={
                        data
                          .filter(i => i.user_id !== item.user_id)
                          .findIndex(i => i.role === 'owner') >= 0
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
