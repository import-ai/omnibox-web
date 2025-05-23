import { UserPermission } from '@/interface';
import UserCard from '@/components/user-card';
import Action from '@/components/permission-action';

interface IProps {
  resource_id: string;
  namespace_id: string;
  refetch: () => void;
  data: Array<UserPermission>;
}

export default function User(props: IProps) {
  const { data, resource_id, namespace_id, refetch } = props;
  const uid = localStorage.getItem('uid');

  return (
    <>
      {data.map((item: UserPermission) => (
        <div
          key={item.user ? item.user.id : item.level}
          className="flex items-center p-2 -m-2 rounded-sm transition-all justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-400"
        >
          {item.user ? (
            <>
              <UserCard
                email={item.user.email}
                username={item.user.username}
                you={item.user.id === uid}
              />
              <Action
                value={item.level}
                refetch={refetch}
                user_id={item.user.id}
                resource_id={resource_id}
                namespace_id={namespace_id}
                canNoAccess={item.level === 'no_access'}
                alertWhenDelete={
                  data
                    .filter(
                      (node) =>
                        node.user && item.user && node.user.id !== item.user.id,
                    )
                    .findIndex((node) => node.level === 'full_access') < 0
                }
              />
            </>
          ) : (
            '--'
          )}
        </div>
      ))}
    </>
  );
}
