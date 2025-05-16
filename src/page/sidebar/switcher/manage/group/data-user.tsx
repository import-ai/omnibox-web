import { Member } from '@/interface';
import AddMember from '../add-member';
import UserCard from '@/components/user-card';
import { Button } from '@/components/ui/button';
import PopConfirm from '@/components/popconfirm';
import { UseGroupUser } from './use-group-user';

interface GroupProps extends UseGroupUser {
  member: Array<Member>;
  namespace_id: string;
  onRemove: (id: string) => void;
  groupUserRefetch: () => void;
  groupUserData: Array<{ id: string; email: string; username: string }>;
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

  return (
    <div className="pl-8 pr-3 py-2">
      {groupUserData.map((item) => (
        <div key={item.id} className="flex items-center justify-between">
          <div className="flex items-center">
            <UserCard username={item.username} />
            <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">
              工作空间所有者
            </span>
          </div>
          <PopConfirm title="确定要移除此成员？" onOk={() => onRemove(item.id)}>
            <Button size="sm" variant="ghost" className="hover:text-red-500">
              移除
            </Button>
          </PopConfirm>
        </div>
      ))}
      <AddMember
        group_id={group_id}
        refetch={groupUserRefetch}
        namespace_id={namespace_id}
        data={member.filter(
          (item) => groupUserData.findIndex((i) => i.id === item.id) < 0,
        )}
      />
    </div>
  );
}
