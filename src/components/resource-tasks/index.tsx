import { ListChecks, ListVideo, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RESOURCE_TASKS_INTERVAL } from '@/const.ts';
import { Resource, Task } from '@/interface';
import { http } from '@/lib/request';

import { CONTENT_MODIFYING_FUNCTIONS, DISPLAY_FUNCTIONS } from './const';
import { DoneIcon } from './done-icon';
import { ProgressIcon } from './progress-icon';
import { TaskTag } from './task-tag';
import { hasActiveContentModifyingTasks } from './utils';

interface ResourceTasksProps {
  resource: Resource;
  namespaceId: string;
  onResource: (resource: Resource) => void;
}

export default function ResourceTasks({
  resource,
  namespaceId,
  onResource,
}: ResourceTasksProps) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <ListChecks className="size-4 text-[#8F959E]" />
        <span className="text-[#8F959E] min-w-[80px]">
          {t('tasks.related_tasks')}
        </span>
        <span className="flex items-center text-[#585D65] dark:text-white h-7">
          <LoaderCircle className="transition-transform animate-spin" />
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3">
        <ListChecks className="size-4 text-[#8F959E]" />
        <span className="text-[#8F959E] min-w-[80px]">
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

  // Group tasks by status
  const pendingTasks = relevantTasks.filter(task => task.status === 'pending');
  const runningTasks = relevantTasks.filter(task => task.status === 'running');
  const finishedTasks = relevantTasks.filter(
    task => task.status === 'finished'
  );

  return (
    <div className="flex items-center gap-3">
      <ListChecks className="size-4 text-[#8F959E]" />
      <span className="text-[#8F959E] min-w-[80px]">
        {t('tasks.related_tasks')}
      </span>
      <span className="flex items-center text-foreground h-7">
        <span className="flex gap-2">
          {pendingTasks.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className="focus-visible:outline-none">
                <Button
                  variant="secondary"
                  className="h-6 rounded-[8px] gap-[2px] py-0 px-2 text-xs focus-visible:outline-none border border-neutral-500 text-neutral-500 bg-transparent dark:border-neutral-300 dark:text-neutral-300"
                >
                  <ListVideo />
                  {t('tasks.status_label_pending')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                className="flex flex-col gap-[5px] p-[3px] min-w-[93px] max-h-[90px] overflow-y-auto"
              >
                {pendingTasks.map(task => (
                  <DropdownMenuItem
                    key={task.id}
                    className="p-0 focus:bg-transparent"
                  >
                    <TaskTag type={task.function as any} />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {runningTasks.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className="focus-visible:outline-none">
                <Button
                  variant="secondary"
                  className="h-6 rounded-[8px] gap-[2px] py-0 px-2 text-xs border border-blue-500 text-blue-500 bg-transparent dark:border-blue-400 dark:text-blue-400"
                >
                  <ProgressIcon />
                  {t('tasks.status_label_running')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                className="flex flex-col gap-[5px] p-[3px] min-w-[93px] max-h-[90px] overflow-y-auto"
              >
                {runningTasks.map(task => (
                  <DropdownMenuItem
                    key={task.id}
                    className="p-0 focus:bg-transparent"
                  >
                    <TaskTag type={task.function as any} />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {finishedTasks.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className="focus-visible:outline-none">
                <Button
                  variant="secondary"
                  className="h-6 rounded-[8px] gap-[2px] py-0 px-2 text-xs border border-green-600 text-green-600 bg-transparent dark:border-green-500 dark:text-green-500"
                >
                  <DoneIcon />
                  {t('tasks.status_label_finished')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                className="flex flex-col gap-[5px] p-[3px] min-w-[93px] max-h-[90px] overflow-y-auto"
              >
                {finishedTasks.map(task => (
                  <DropdownMenuItem
                    key={task.id}
                    className="p-0 focus:bg-transparent"
                  >
                    <TaskTag type={task.function as any} />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </span>
        {hasActiveContentModifyingTasks(relevantTasks) && (
          <LoaderCircle className="ml-2 transition-transform animate-spin" />
        )}
      </span>
    </div>
  );
}
