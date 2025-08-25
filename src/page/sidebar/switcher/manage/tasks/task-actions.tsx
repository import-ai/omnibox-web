import { ExternalLink, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Task } from '@/interface.ts';
import { http } from '@/lib/request';

export interface TaskActionsProps {
  task: Task;
  namespaceId: string;
  onTaskUpdated: () => void;
}

export function TaskActions({
  task,
  namespaceId,
  onTaskUpdated,
}: TaskActionsProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const canCancel = task.status === 'pending' || task.status === 'running';
  const canRerun = task.status === 'canceled';

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      await http.patch(`/namespaces/${namespaceId}/tasks/${task.id}/cancel`);
      toast.success(t('tasks.cancel_success'));
      onTaskUpdated();
    } catch (error) {
      toast.error(t('tasks.cancel_error'));
      console.error('Cancel task error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRerun = async () => {
    setIsLoading(true);
    try {
      await http.post(`/namespaces/${namespaceId}/tasks/${task.id}/rerun`);
      toast.success(t('tasks.rerun_success'));
      onTaskUpdated();
    } catch (error) {
      toast.error(t('tasks.rerun_error'));
      console.error('Rerun task error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      {task.attrs?.resource_id && (
        <Button size="sm" variant="outline" asChild>
          <Link to={`/${namespaceId}/${task.attrs.resource_id}`}>
            <ExternalLink className="h-4 w-4" />
            {t('tasks.view_resource')}
          </Link>
        </Button>
      )}
      {canCancel && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
          {t('tasks.cancel')}
        </Button>
      )}
      {canRerun && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleRerun}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4" />
          {t('tasks.rerun')}
        </Button>
      )}
    </div>
  );
}
