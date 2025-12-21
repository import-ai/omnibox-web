import { format, formatDistanceToNow } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
    const locale = i18n.language === 'zh' ? zhCN : enUS;

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

    if (task.status === 'canceled' && task.canceled_at) {
      const canceledAt = new Date(task.canceled_at);
      return t('tasks.time_canceled', {
        time: formatDistanceToNow(canceledAt, { locale, addSuffix: true }),
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
      <div className="flex items-center justify-center w-full h-full">
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
    <div className="flex flex-col h-full">
      <div className="flex w-full items-center justify-between gap-2 shrink-0 mb-2 lg:mb-4">
        <div className="flex items-center gap-2 lg:gap-4">
          <h3 className="text-sm lg:text-base font-semibold text-foreground">
            {t('tasks.title')}
          </h3>
          {showViewFilter && (
            <Select value={viewFilter} onValueChange={handleViewFilterChange}>
              <SelectTrigger className="h-7 lg:h-[30px] w-[100px] lg:w-[120px] text-xs lg:text-sm">
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
          size="sm"
          className="h-7 lg:h-[30px] px-2 lg:px-3 text-xs lg:text-sm font-semibold shrink-0"
          onClick={handleRefresh}
        >
          {t('common.refresh')}
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p className="text-sm lg:text-base">{t('tasks.no_tasks')}</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto max-w-[83vw] sm:max-w-full rounded-md border border-border">
          <div className="min-w-[320px]">
            <div className="flex w-full h-8 lg:h-10 items-center border-b border-border px-2 lg:px-8 text-xs lg:text-sm font-medium text-muted-foreground sticky top-0 bg-background z-10">
              <div className="flex-1 min-w-[100px] whitespace-nowrap">
                {t('tasks.function')}
              </div>
              <div className="w-12 md:w-16 ml-2 lg:ml-4 whitespace-nowrap text-center">
                {t('tasks.status')}
              </div>
              <div className="flex-1 min-w-[90px] ml-4 lg:ml-6 md:whitespace-nowrap">
                {t('tasks.time')}
              </div>
              <div className="w-14 lg:w-16 whitespace-nowrap text-right">
                {t('common.actions')}
              </div>
            </div>

            <div className="w-full">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className="flex w-full h-12 lg:h-14 items-center border-b border-border px-2 lg:px-8 last:border-b-0"
                >
                  <div className="flex-1 min-w-[100px]">
                    <TaskTypeBadge functionName={task.function} />
                  </div>

                  <div className="flex w-12 md:w-16 ml-2 lg:ml-4 justify-center">
                    <TaskStatusBadge status={task.status as any} />
                  </div>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-1 min-w-[90px] ml-4 lg:ml-6 cursor-default text-xs font-medium text-muted-foreground md:whitespace-nowrap">
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

                  <div className="w-14 lg:w-16 flex justify-end">
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
