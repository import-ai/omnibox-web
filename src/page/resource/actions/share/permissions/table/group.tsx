import { useTranslation } from 'react-i18next';

import GroupAction from '@/components/permission-action/group';
import UserCard from '@/components/user-card';
import { GroupPermission } from '@/interface';

interface IProps {
  resource_id: string;
  namespace_id: string;
  refetch: () => void;
  data: Array<GroupPermission>;
}

export default function Group(props: IProps) {
  const { data, resource_id, namespace_id, refetch } = props;
  const { t } = useTranslation();

  return (
    <>
      {data.map((item: GroupPermission) => (
        <div
          key={item.group.id}
          className="flex items-center p-2 -m-2 rounded-sm transition-all justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-400"
        >
          <UserCard email={t('manage.group')} username={item.group.title} />
          <GroupAction
            value={item.permission}
            refetch={refetch}
            group_id={item.group.id}
            resource_id={resource_id}
            namespace_id={namespace_id}
          />
        </div>
      ))}
    </>
  );
}
