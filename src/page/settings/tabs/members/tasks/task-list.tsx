import { format, formatDistanceToNow } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Task } from '@/interface';
import { http } from '@/lib/request';

import { TaskActions } from './task-actions';
import { TaskPagination } from './task-pagination';
import { TaskStatusBadge } from './task-status-badge';
import { TaskTypeBadge } from './task-type-badge';

export interface TaskListProps {
  namespaceId: string;
}

export function TaskList({ namespaceId }: TaskListProps) {
  const { t, i18n } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [viewFilter, setViewFilter] = useState<'own' | 'all'>('own');
  const pageSize = 20;

  const getTimeDescription = (task: Task): string => {
    const now = new Date();
    const locale = i18n.language.startsWith('zh-') ? zhCN : enUS;

    if (task.status === 'running' && task.started_at) {
      const startedAt = new Date(task.started_at);
      const seconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
      if (seconds < 60) {
        return t('tasks.time_running_seconds', { seconds });
      }
      return t('tasks.time_running', {
        time: formatDistanceToNow(startedAt, { locale, addSuffix: false }),
      });
    }

    if (task.status === 'pending' && task.created_at) {
      const createdAt = new Date(task.created_at);
      const seconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000);
      if (seconds < 60) {
        return t('tasks.time_pending_seconds', { seconds });
      }
      return t('tasks.time_pending', {
        time: formatDistanceToNow(createdAt, { locale, addSuffix: false }),
      });
    }

    if (task.status === 'finished' && task.started_at && task.ended_at) {
      const startedAt = new Date(task.started_at);
      const endedAt = new Date(task.ended_at);
      const seconds = Math.floor(
        (endedAt.getTime() - startedAt.getTime()) / 1000
      );
      if (seconds < 60) {
        return t('tasks.time_finished_seconds', { seconds });
      }
      const minutes = Math.floor(seconds / 60);
      return t('tasks.time_finished_minutes', { minutes });
    }

    if (task.status === 'error' && task.started_at && task.ended_at) {
      const startedAt = new Date(task.started_at);
      const endedAt = new Date(task.ended_at);
      const seconds = Math.floor(
        (endedAt.getTime() - startedAt.getTime()) / 1000
      );
      if (seconds < 60) {
        return t('tasks.time_error_seconds', { seconds });
      }
      const minutes = Math.floor(seconds / 60);
      return t('tasks.time_error_minutes', { minutes });
    }

    if (task.status === 'timeout' && task.started_at && task.ended_at) {
      const startedAt = new Date(task.started_at);
      const endedAt = new Date(task.ended_at);
      const seconds = Math.floor(
        (endedAt.getTime() - startedAt.getTime()) / 1000
      );
      if (seconds < 60) {
        return t('tasks.time_timeout_seconds', { seconds });
      }
      const minutes = Math.floor(seconds / 60);
      return t('tasks.time_timeout_minutes', { minutes });
    }

    if (task.status === 'canceled' && task.canceled_at) {
      const canceledAt = new Date(task.canceled_at);
      return t('tasks.time_canceled', {
        time: formatDistanceToNow(canceledAt, { locale, addSuffix: true }),
      });
    }

    if (task.status === 'insufficient_quota' && task.ended_at) {
      const endedAt = new Date(task.ended_at);
      return t('tasks.time_insufficient_quota', {
        time: formatDistanceToNow(endedAt, { locale, addSuffix: true }),
      });
    }

    return '-';
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = localStorage.getItem('uid');
      const offset = (currentPage - 1) * pageSize;
      const params: any = {
        limit: pageSize,
        offset,
      };

      // Add userId filter when viewing "own" tasks
      if (viewFilter === 'own' && userId) {
        params.userId = userId;
      }

      const response = await http.get(`/namespaces/${namespaceId}/tasks`, {
        params,
      });

      setTasks(response?.tasks || []);
      setTotalTasks(response?.total || 0);
    } catch (err) {
      setError(t('tasks.fetch_error'));
      console.error('Fetch tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user role and member count
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const userId = localStorage.getItem('uid');
        if (!userId) return;

        // Check if user is owner or admin
        const memberResponse = await http.get(
          `/namespaces/${namespaceId}/members/${userId}`,
          { mute: true }
        );
        const userIsOwnerOrAdmin =
          memberResponse?.role === 'owner' || memberResponse?.role === 'admin';
        setIsOwnerOrAdmin(userIsOwnerOrAdmin);

        // Get member count
        const membersResponse = await http.get(
          `/namespaces/${namespaceId}/members`,
          { mute: true }
        );
        setMemberCount(membersResponse?.length || 0);
      } catch (err) {
        console.error('Fetch user info error:', err);
      }
    };

    fetchUserInfo();
  }, [namespaceId]);

  useEffect(() => {
    fetchTasks();
  }, [namespaceId, currentPage, viewFilter]);

  const handleRefresh = () => {
    fetchTasks();
  };

  const handleViewFilterChange = (value: 'own' | 'all') => {
    setViewFilter(value);
    setCurrentPage(1); // Reset to first page when changing filter
  };

  const totalPages = Math.ceil(totalTasks / pageSize);
  const showViewFilter = isOwnerOrAdmin && memberCount > 1;

  if (loading) {
    return (
      <div className="flex size-full items-center justify-center">
        <Spinner className="size-6 text-gray-400" />
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

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex w-full shrink-0 items-center justify-between gap-2 lg:mb-4">
        <div className="flex items-center gap-2 lg:gap-4">
          <h3 className="text-sm font-semibold text-foreground lg:text-base">
            {t('tasks.title')}
          </h3>
          {showViewFilter && (
            <Select value={viewFilter} onValueChange={handleViewFilterChange}>
              <SelectTrigger className="h-7 w-[100px] text-xs lg:h-[30px] lg:w-[120px] lg:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="own">{t('tasks.my_tasks')}</SelectItem>
                <SelectItem value="all">{t('tasks.all_tasks')}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <Button
          variant="default"
          onClick={handleRefresh}
          className="h-[30px] w-[71px] shrink-0 text-xs font-medium"
        >
          {t('common.refresh')}
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <p className="text-sm lg:text-base">{t('tasks.no_tasks')}</p>
        </div>
      ) : (
        <div className="min-h-0 max-w-[83vw] flex-1 overflow-auto rounded-md border border-border sm:max-w-full">
          <div className="min-w-[320px]">
            <div className="sticky top-0 z-10 flex h-8 w-full items-center border-b border-border bg-background px-2 text-xs font-medium text-muted-foreground lg:h-10 lg:px-8 lg:text-sm">
              <div className="min-w-[100px] flex-1 whitespace-nowrap">
                {t('tasks.function')}
              </div>
              <div className="ml-2 w-12 whitespace-nowrap text-center md:w-16 lg:ml-4">
                {t('tasks.status')}
              </div>
              <div className="ml-4 min-w-[90px] flex-1 md:whitespace-nowrap lg:ml-6">
                {t('tasks.time')}
              </div>
              <div className="w-14 whitespace-nowrap text-right lg:w-16">
                {t('common.actions')}
              </div>
            </div>

            <div className="w-full">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className="flex h-12 w-full items-center border-b border-border px-2 last:border-b-0 lg:h-14 lg:px-8"
                >
                  <div className="min-w-[100px] flex-1">
                    <TaskTypeBadge functionName={task.function} />
                  </div>

                  <div className="ml-2 flex w-12 justify-center md:w-16 lg:ml-4">
                    <TaskStatusBadge status={task.status as any} />
                  </div>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="ml-4 min-w-[90px] flex-1 cursor-pointer text-xs font-medium text-muted-foreground md:whitespace-nowrap lg:ml-6">
                          {getTimeDescription(task)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="p-2.5">
                        <div className="text-xs">
                          <div>
                            {t('tasks.task_id')}：{task.id}
                          </div>
                          <div>
                            {t('tasks.created_at')}：
                            {task.created_at
                              ? format(
                                  new Date(task.created_at),
                                  'yyyy-MM-dd HH:mm:ss'
                                )
                              : '-'}
                          </div>
                          <div>
                            {t('tasks.started_at')}：
                            {task.started_at
                              ? format(
                                  new Date(task.started_at),
                                  'yyyy-MM-dd HH:mm:ss'
                                )
                              : '-'}
                          </div>
                          <div>
                            {t('tasks.ended_at')}：
                            {task.ended_at
                              ? format(
                                  new Date(task.ended_at),
                                  'yyyy-MM-dd HH:mm:ss'
                                )
                              : '-'}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <div className="flex w-14 justify-end lg:w-16">
                    <TaskActions
                      task={task}
                      namespaceId={namespaceId}
                      onTaskUpdated={fetchTasks}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <TaskPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
