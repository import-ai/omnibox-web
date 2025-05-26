import { Role, Member } from '@/interface';
import AddMember from '../add-member';
import UserCard from '@/components/user-card';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import PopConfirm from '@/components/popconfirm';
import { UseGroupUser } from './use-group-user';

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
    <div className="pl-8 pr-3 py-2">
      {groupUserData.map((item) => (
        <div key={item.id} className="flex items-center justify-between">
          <div className="flex items-center">
            <UserCard username={item.username} />
            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
              {t(`manage.${item.role}`)}
            </span>
          </div>
          <PopConfirm
            title={t('manage.remove_member')}
            onOk={() => onRemove(item.id)}
          >
            <Button size="sm" variant="ghost" className="hover:text-red-500">
              {t('manage.remove_from_group')}
            </Button>
          </PopConfirm>
        </div>
      ))}
      <AddMember
        group_id={group_id}
        refetch={groupUserRefetch}
        namespace_id={namespace_id}
        data={member.filter(
          (item) => groupUserData.findIndex((i) => i.email === item.email) < 0,
        )}
      />
    </div>
  );
}
