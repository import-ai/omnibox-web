import { format, isValid } from 'date-fns';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { http } from '@/lib/request';

import { Task, TaskActions } from './task-actions';
import { TaskStatusBadge } from './task-status-badge';

export interface TaskListProps {
  namespaceId: string;
}

export function TaskList({ namespaceId }: TaskListProps) {
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
      setLoading(true);
      setError(null);
      const response = await http.get(`/namespaces/${namespaceId}/tasks`, {
        params: { limit: 50 },
      });
      setTasks(response || []);
    } catch (err) {
      setError(t('tasks.fetch_error'));
      console.error('Fetch tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [namespaceId]);

  const handleRefresh = () => {
    fetchTasks();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        <p>{error}</p>
        <Button variant="outline" onClick={handleRefresh} className="mt-2">
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>{t('tasks.no_tasks')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{t('tasks.title')}</h3>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          {t('common.refresh')}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('tasks.function')}</TableHead>
              <TableHead>{t('tasks.status')}</TableHead>
              <TableHead>{t('tasks.created_at')}</TableHead>
              <TableHead>{t('tasks.started_at')}</TableHead>
              <TableHead>{t('tasks.ended_at')}</TableHead>
              <TableHead>{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map(task => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">
                  {formatFunction(task.function)}
                </TableCell>
                <TableCell>
                  <TaskStatusBadge status={task.status as any} />
                </TableCell>
                <TableCell>{formatDate(task.created_at)}</TableCell>
                <TableCell>{formatDate(task.started_at)}</TableCell>
                <TableCell>
                  {task.ended_at
                    ? formatDate(task.ended_at)
                    : task.canceled_at
                      ? formatDate(task.canceled_at) + ' (canceled)'
                      : '-'}
                </TableCell>
                <TableCell>
                  <TaskActions
                    task={task}
                    namespaceId={namespaceId}
                    onTaskUpdated={fetchTasks}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
