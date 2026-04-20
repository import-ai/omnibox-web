import { useParams } from 'react-router-dom';

import { TaskList } from './task-list';

export default function TasksManagement() {
  const { namespace_id: namespaceId } = useParams();

  if (!namespaceId) {
    return <div>Invalid namespace</div>;
  }

  return (
    <div className="h-full">
      <TaskList namespaceId={namespaceId} />
    </div>
  );
}
