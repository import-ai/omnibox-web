import { format, isValid } from 'date-fns';
import { RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Resource } from '@/interface';
import { http } from '@/lib/request';
import { TaskStatusBadge } from '@/page/sidebar/switcher/manage/tasks/task-status-badge';

interface TaskAttrs {
  resource_id?: string;
  message_id?: string;
  conversation_id?: string;
}

interface Task {
  id: string;
  status: string;
  function: string;
  created_at: string;
  attrs: TaskAttrs | null;
  started_at: string | null;
  ended_at: string | null;
  canceled_at: string | null;
}

interface ResourceTasksProps {
  resource: Resource;
  namespaceId: string;
  onResource: (resource: Resource) => void;
}

const CONTENT_MODIFYING_FUNCTIONS = [
  'collect',
  'file_reader',
  'extract_tags',
  'generate_title',
];

export default function ResourceTasks({
  resource,
  namespaceId,
  onResource,
}: ResourceTasksProps) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateValue: string | null | undefined): string => {
    if (!dateValue) return '-';
    const date = new Date(dateValue);
    if (!isValid(date)) return '-';
    return format(date, 'yyyy-MM-dd HH:mm:ss');
  };

  const formatFunction = (functionName: string): string => {
    const translationKey = `tasks.functions.${functionName}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : functionName;
  };

  const fetchTasks = async () => {
    try {
      setError(null);
      const response = await http.get(
        `/namespaces/${namespaceId}/resources/${resource.id}/tasks`
      );
      setTasks(response || []);
    } catch (err) {
      setError(t('tasks.fetch_error'));
      console.error('Fetch resource tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasActiveContentModifyingTasks = (taskList: Task[]): boolean => {
    return taskList.some(
      task =>
        CONTENT_MODIFYING_FUNCTIONS.includes(task.function) &&
        (task.status === 'running' || task.status === 'pending')
    );
  };

  const handleCancel = async (taskId: string) => {
    try {
      await http.patch(`/namespaces/${namespaceId}/tasks/${taskId}/cancel`);
      toast.success(t('tasks.cancel_success'));
      await fetchTasks();
    } catch (error) {
      toast.error(t('tasks.cancel_error'));
      console.error('Cancel task error:', error);
    }
  };

  const handleRerun = async (taskId: string) => {
    try {
      await http.post(`/namespaces/${namespaceId}/tasks/${taskId}/rerun`);
      toast.success(t('tasks.rerun_success'));
      await fetchTasks();
    } catch (error) {
      toast.error(t('tasks.rerun_error'));
      console.error('Rerun task error:', error);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [resource.id, namespaceId]);

  // Auto-refresh logic for content-modifying tasks
  useEffect(() => {
    if (!hasActiveContentModifyingTasks(tasks)) {
      return;
    }

    const interval = setInterval(async () => {
      const previousActiveTasks = tasks.filter(
        task =>
          CONTENT_MODIFYING_FUNCTIONS.includes(task.function) &&
          (task.status === 'running' || task.status === 'pending')
      );

      await fetchTasks();

      // Fetch updated tasks to compare
      try {
        const response = await http.get(
          `/namespaces/${namespaceId}/resources/${resource.id}/tasks`
        );
        const updatedTasks = response || [];

        // Check if any previously active content-modifying task has finished
        const wasActiveNowFinished = previousActiveTasks.some(prevTask => {
          const updatedTask = updatedTasks.find(
            (t: Task) => t.id === prevTask.id
          );
          return (
            updatedTask &&
            CONTENT_MODIFYING_FUNCTIONS.includes(updatedTask.function) &&
            updatedTask.status !== 'running' &&
            updatedTask.status !== 'pending'
          );
        });

        if (wasActiveNowFinished) {
          // Refresh the resource content
          try {
            const resourceResponse = await http.get(
              `/namespaces/${namespaceId}/resources/${resource.id}`
            );
            if (resourceResponse) {
              onResource(resourceResponse);
            }
          } catch (err) {
            console.error('Failed to refresh resource:', err);
          }
        }
      } catch (err) {
        console.error('Failed to check task updates:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tasks, resource.id, namespaceId, onResource]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <div className="animate-spin h-3 w-3 border border-muted-foreground border-t-transparent rounded-full" />
        {t('tasks.loading')}
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-600 mb-2">{error}</div>;
  }

  if (tasks.length === 0) {
    return null;
  }

  // Show only recent tasks (last 24 hours) or currently active tasks
  const relevantTasks = tasks.filter(task => {
    const isActive = task.status === 'running' || task.status === 'pending';
    const isRecent =
      new Date(task.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
    return isActive || isRecent;
  });

  if (relevantTasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {t('tasks.related_tasks')}
        </span>
        {hasActiveContentModifyingTasks(relevantTasks) && (
          <div className="animate-spin h-3 w-3 border border-muted-foreground border-t-transparent rounded-full" />
        )}
      </div>

      <div className="space-y-1">
        {relevantTasks.map(task => (
          <div
            key={task.id}
            className="flex items-center gap-3 text-sm p-2 bg-muted/30 rounded"
          >
            <div className="flex-1 flex items-center gap-2">
              <span className="font-medium min-w-[100px]">
                {formatFunction(task.function)}
              </span>
              <TaskStatusBadge status={task.status as any} />
              <span className="text-xs text-muted-foreground">
                {task.started_at
                  ? formatDate(task.started_at)
                  : formatDate(task.created_at)}
              </span>
              {task.ended_at && (
                <span className="text-xs text-muted-foreground">
                  → {formatDate(task.ended_at)}
                </span>
              )}
            </div>

            <div className="flex gap-1">
              {(task.status === 'running' || task.status === 'pending') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCancel(task.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              {task.status === 'canceled' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRerun(task.id)}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
