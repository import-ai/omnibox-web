import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import Invite from '@/components/invite-dialog';
import PermissionAction from '@/components/permission-action';
import { SearchField } from '@/components/search/SearchField';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import UserCard from '@/components/user-card';
import { Member, Role } from '@/interface';

import Action from './Action';
import { memberDisplayName } from './memberDisplay';
import MemberDisplayEditor from './MemberDisplayEditor';

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
  canManageMembers: boolean;
  onSearch: (value: string) => void;
}

export default function MemberMain(props: MemberProps) {
  const {
    search,
    data,
    namespace_id,
    namespaceName,
    canManageMembers,
    refetch,
    onSearch,
  } = props;
  const { t } = useTranslation();
  const uid = localStorage.getItem('uid');
  const currentUserMember = data.find(item => item.user_id === uid);
  const currentUserRole = currentUserMember?.role;

  return (
    <div className="space-y-2 lg:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SearchField
          value={search}
          onValueChange={onSearch}
          placeholder={t('manage.search')}
          clearLabel={t('search.clear')}
          containerClassName="w-full max-w-sm min-w-0 flex-1"
        />
        {canManageMembers && (
          <Invite onFinish={refetch}>
            <Button variant="default">{t('manage.add')}</Button>
          </Invite>
        )}
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('manage.user')}</TableHead>
              <TableHead>{t('manage.permission')}</TableHead>
              <TableHead>{t('manage.role')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(item => {
              // Check if current user can modify target based on role hierarchy
              const currentLevel = ROLE_LEVEL[currentUserRole ?? 'member'];
              const targetLevel = ROLE_LEVEL[item.role];
              const canModifyTarget =
                currentUserRole === 'owner' || currentLevel < targetLevel;

              return (
                <TableRow key={item.user_id} className="group">
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-1">
                      <UserCard
                        email={item.email || ''}
                        username={item.username}
                        nickname={item.nickname}
                        note={item.note}
                        you={item.user_id === uid}
                      />
                      <MemberDisplayEditor
                        member={item}
                        namespaceId={namespace_id}
                        canEditNickname={item.user_id === uid}
                        refetch={refetch}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <PermissionAction
                      disabled={!canManageMembers || !canModifyTarget}
                      value={item.permission}
                      refetch={refetch}
                      user_id={item.user_id}
                      namespace_id={namespace_id}
                      canRemove={false}
                      canNoAccess={true}
                    />
                  </TableCell>
                  <TableCell>
                    <Action
                      disabled={!canManageMembers}
                      id={item.user_id}
                      value={item.role}
                      currentUserRole={currentUserRole}
                      targetUsername={memberDisplayName(item)}
                      refetch={refetch}
                      namespace_id={namespace_id}
                      namespaceName={namespaceName}
                      hasOwner={
                        data
                          .filter(i => i.user_id !== item.user_id)
                          .findIndex(i => i.role === 'owner') >= 0
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t('manage.no_results')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
