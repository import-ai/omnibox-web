import type { ResourcePermissionsData } from '../useResourcePermissions';
import Group from './Group';
import User from './User';

interface UserFormProps {
  resource_id: string;
  namespace_id: string;
  data: ResourcePermissionsData;
  refetch: () => Promise<void>;
}

export default function Wrapper(props: UserFormProps) {
  const { resource_id, namespace_id, data, refetch } = props;

  return (
    <div className="space-y-2 text-sm max-h-[60vh] sm:max-h-[60vh] overflow-y-auto overflow-x-hidden pr-3">
      <User
        data={data.users}
        refetch={refetch}
        resource_id={resource_id}
        namespace_id={namespace_id}
        current_permission={data.current_permission}
        current_role={data.current_role}
      />
      <Group
        data={data.groups}
        refetch={refetch}
        resource_id={resource_id}
        namespace_id={namespace_id}
        current_permission={data.current_permission}
        current_role={data.current_role}
      />
    </div>
  );
}
