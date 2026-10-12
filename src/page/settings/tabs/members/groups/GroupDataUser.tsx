import { useTranslation } from 'react-i18next';

import PopConfirm from '@/components/popconfirm';
import { Button } from '@/components/ui/Button';
import UserCard from '@/components/user-card';
import { Member, Role } from '@/interface';

import AddMember from '../AddMember';
import { findMemberByUserId } from '../memberDisplay';
import { UseGroupUser } from './useGroupUser';

interface GroupProps extends UseGroupUser {
  member: Array<Member>;
  namespace_id: string;
  onRemove: (id: string) => void;
  groupUserRefetch: () => void;
  groupUserData: Array<{
    id: string;
    role: Role;
    email: string;
    username: string;
  }>;
}

export default function GroupDataUser(props: GroupProps) {
  const {
    group_id,
    member,
    namespace_id,
    groupUserData,
    onRemove,
    groupUserRefetch,
  } = props;
  const { t } = useTranslation();

  return (
    <div className="pb-2 pl-6 pr-3">
      {groupUserData.map(item => {
        const profile = findMemberByUserId(member, item.id);
        return (
          <div
            key={item.id}
            className="flex h-[50px] items-center justify-between gap-2 border-b border-border lg:h-[60px]"
          >
            <div className="flex min-w-0 items-center">
              <UserCard
                email={item.email || profile?.email || ''}
                username={item.username}
                nickname={profile?.nickname}
                note={profile?.note}
              />
              <span className="ml-2 shrink-0 whitespace-nowrap rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
                {t(`manage.${item.role}`)}
              </span>
            </div>
            <PopConfirm
              title={t('manage.remove_member')}
              onOk={() => onRemove(item.id)}
              okText={t('ok')}
              cancelText={t('cancel')}
            >
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 hover:text-red-500"
              >
                {t('manage.remove_from_group')}
              </Button>
            </PopConfirm>
          </div>
        );
      })}
      <AddMember
        group_id={group_id}
        refetch={groupUserRefetch}
        namespace_id={namespace_id}
        data={member.filter(
          item => groupUserData.findIndex(i => i.email === item.email) < 0
        )}
      />
    </div>
  );
}
