import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Resource } from '@/interface';
import { http } from '@/lib/request';

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

const DISPLAY_FUNCTIONS = [
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

  const formatFunction = (functionName: string): string => {
    const translationKey = `tasks.functions.${functionName}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : functionName;
  };

  const getTaskBadgeConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800',
        };
      case 'running':
        return {
          variant: 'default' as const,
          className: 'bg-blue-100 text-blue-800',
        };
      case 'finished':
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800',
        };
      case 'canceled':
        return {
          variant: 'outline' as const,
          className: 'bg-yellow-100 text-yellow-800',
        };
      case 'error':
        return {
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800',
        };
      default:
        return {
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800',
        };
    }
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

      <div className="flex flex-wrap gap-2">
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
      </div>
    </div>
  );
}
