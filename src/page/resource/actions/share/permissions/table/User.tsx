import Action from '@/components/permission-action';
import UserCard from '@/components/user-card';
import { Member, Permission, Role, UserPermission } from '@/interface';
import { findMemberByUserId } from '@/page/settings/tabs/members/memberDisplay';

const ROLE_LEVEL: Record<Role, number> = {
  owner: 0,
  admin: 1,
  member: 2,
};

interface IProps {
  resource_id: string;
  namespace_id: string;
  refetch: () => void;
  data: Array<UserPermission>;
  members: Array<Member>;
  current_permission: Permission;
  current_role: Role;
}

export default function User(props: IProps) {
  const {
    data,
    members,
    resource_id,
    namespace_id,
    refetch,
    current_permission,
    current_role,
  } = props;
  const uid = localStorage.getItem('uid');

  const canModifyUser = (targetRole?: Role): boolean => {
    // Must have FULL_ACCESS to modify permissions
    if (current_permission !== 'full_access') {
      return false;
    }
    // Owner can modify anyone
    if (current_role === 'owner') {
      return true;
    }
    // Member cannot modify anyone
    if (current_role === 'member') {
      return false;
    }
    // Admin can only modify members
    const currentLevel = ROLE_LEVEL[current_role];
    const targetLevel = ROLE_LEVEL[targetRole || 'member'];
    return currentLevel < targetLevel;
  };

  return (
    <>
      {data.map((item: UserPermission) => {
        const profile = findMemberByUserId(members, item.user?.id);
        return (
          <div
            key={item.user ? item.user.id : item.permission}
            className="flex items-center p-2 rounded-sm transition-all justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
          >
            {item.user ? (
              <>
                <UserCard
                  email={item.user.email}
                  username={item.user.username}
                  nickname={profile?.nickname}
                  note={profile?.note}
                  you={item.user.id === uid}
                />
                <Action
                  value={item.permission}
                  refetch={refetch}
                  user_id={item.user.id}
                  resource_id={resource_id}
                  namespace_id={namespace_id}
                  canNoAccess={item.permission === 'no_access'}
                  isOwner={item.role === 'owner'}
                  disabled={!canModifyUser(item.role)}
                  canRemove={canModifyUser(item.role) && item.user.id !== uid}
                  alertWhenDelete={
                    data
                      .filter(
                        node =>
                          node.user &&
                          item.user &&
                          node.user.id !== item.user.id
                      )
                      .findIndex(node => node.permission === 'full_access') < 0
                  }
                />
              </>
            ) : (
              '--'
            )}
          </div>
        );
      })}
    </>
  );
}
