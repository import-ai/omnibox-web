import { ListChecks, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { RESOURCE_TASKS_INTERVAL } from '@/const.ts';
import { Resource, Task, TaskStatus } from '@/interface';
import { http } from '@/lib/request';
import { statusConfig } from '@/page/sidebar/switcher/manage/tasks/task-status-badge';

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
  'generate_video_note',
];

const DISPLAY_FUNCTIONS = CONTENT_MODIFYING_FUNCTIONS;

export default function ResourceTasks({
  resource,
  namespaceId,
  onResource,
}: ResourceTasksProps) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatFunction = (functionName: string): string => {
    const translationKey = `tasks.functions.${functionName}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : functionName;
  };

  const getTaskBadgeConfig = (status: TaskStatus) => {
    return statusConfig[status];
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
    }, RESOURCE_TASKS_INTERVAL);

    return () => clearInterval(interval);
  }, [tasks, resource.id, namespaceId, onResource]);

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <ListChecks className="size-4 text-muted-foreground" />
        <span className="text-muted-foreground font-medium min-w-[80px]">
          {t('tasks.related_tasks')}
        </span>
        <span className="flex items-center text-foreground h-7">
          <LoaderCircle className="transition-transform animate-spin" />
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3">
        <ListChecks className="size-4 text-muted-foreground" />
        <span className="text-muted-foreground font-medium min-w-[80px]">
          {t('tasks.related_tasks')}
        </span>
        <span className="text-sm text-red-600">{error}</span>
      </div>
    );
  }

  if (tasks.length === 0) {
    return null;
  }

  // Show only tasks with specified functions that are recent or active
  const relevantTasks = tasks.filter(task => {
    const isDisplayFunction = DISPLAY_FUNCTIONS.includes(task.function);
    const isActive = task.status === 'running' || task.status === 'pending';
    const isRecent =
      new Date(task.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
    return isDisplayFunction && (isActive || isRecent);
  });

  if (relevantTasks.length === 0) {
    return null;
  }

  // If all tasks finished, display nothing
  if (!hasActiveContentModifyingTasks(relevantTasks)) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <ListChecks className="size-4 text-muted-foreground" />
      <span className="text-muted-foreground font-medium min-w-[80px]">
        {t('tasks.related_tasks')}
      </span>
      <span className="flex items-center text-foreground h-7">
        <span className="flex gap-2">
          {relevantTasks.map(task => {
            const config = getTaskBadgeConfig(task.status);
            return (
              <Badge
                key={task.id}
                variant={config.variant}
                className={config.className}
              >
                {formatFunction(task.function)}
              </Badge>
            );
          })}
        </span>
        {hasActiveContentModifyingTasks(relevantTasks) && (
          <LoaderCircle className="ml-2 transition-transform animate-spin" />
        )}
      </span>
    </div>
  );
}
