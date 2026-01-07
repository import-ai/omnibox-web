import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import PermissionAction from '@/components/permission-action';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import UserCard from '@/components/user-card';
import { Member, Role } from '@/interface';
import { http } from '@/lib/request';

import Invite from '../../invite';
import Action from './action';

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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={t('manage.search')}
          className="h-7 lg:h-9 w-[150px] lg:w-[435px] text-sm rounded-md border-border placeholder:text-muted-foreground bg-transparent dark:bg-transparent"
        />
        <Invite onFinish={refetch}>
          <Button size="sm" className="h-[30px] w-[71px] text-sm font-semibold">
            {t('manage.add')}
          </Button>
        </Invite>
      </div>
      <div className="overflow-auto max-w-[83vw] sm:max-w-full">
        <div className="min-w-[320px]">
          <div className="flex w-full border-b border-border sticky top-0 bg-background z-10">
            <div className="flex h-8 lg:h-10 w-[120px] lg:w-[210px] items-center px-2 text-sm font-medium text-foreground whitespace-nowrap">
              {t('manage.user')}
            </div>
            <div className="flex h-8 lg:h-10 w-[90px] lg:w-[124px] items-center px-2 text-sm font-medium text-foreground whitespace-nowrap">
              {t('manage.permission')}
            </div>
            <div className="flex h-8 lg:h-10 w-[90px] lg:w-[127px] items-center px-2 text-sm font-medium text-foreground whitespace-nowrap">
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
                  className="flex h-[50px] lg:h-[60px] items-center border-b border-border"
                >
                  <div className="w-[120px] lg:w-[210px] px-2 whitespace-nowrap">
                    <UserCard
                      email={item.email || ''}
                      username={item.username}
                    />
                  </div>
                  <div className="w-[90px] lg:w-[124px] px-2 whitespace-nowrap">
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
                  <div className="w-[90px] lg:w-[127px] px-2 whitespace-nowrap">
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
