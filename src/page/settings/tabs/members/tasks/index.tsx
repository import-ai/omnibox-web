import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { Separator } from '@/components/ui/Separator';

import { TaskList } from './TaskList';

export default function TasksManagement() {
  const { t } = useTranslation();
  const { namespace_id: namespaceId } = useParams();

  if (!namespaceId) {
    return <div>Invalid namespace</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-col gap-2.5">
        <h3 className="text-base font-semibold text-foreground">
          {t('tasks.title')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('tasks.description')}
        </p>
      </div>
      <Separator className="my-6" />
      <div className="min-h-0 flex-1">
        <TaskList namespaceId={namespaceId} />
      </div>
    </div>
  );
}
