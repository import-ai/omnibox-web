import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
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
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [viewFilter, setViewFilter] = useState<'own' | 'all'>('own');
  const pageSize = 20;

  const getTimeDescription = (task: Task): string => {
    const now = new Date();
    const locale = zhCN;

    if (task.status === 'running' && task.started_at) {
      const startedAt = new Date(task.started_at);
      const seconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
      if (seconds < 60) {
        return `进行中：已运行 ${seconds} 秒`;
      }
      return `进行中：${formatDistanceToNow(startedAt, { locale, addSuffix: false })}`;
    }

    if (task.status === 'pending' && task.created_at) {
      const createdAt = new Date(task.created_at);
      const seconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000);
      if (seconds < 60) {
        return `排队中：已等待 ${seconds} 秒`;
      }
      return `排队中：${formatDistanceToNow(createdAt, { locale, addSuffix: false })}`;
    }

    if (task.status === 'finished' && task.started_at && task.ended_at) {
      const startedAt = new Date(task.started_at);
      const endedAt = new Date(task.ended_at);
      const seconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
      if (seconds < 60) {
        return `已完成：耗时 ${seconds} 秒`;
      }
      const minutes = Math.floor(seconds / 60);
      return `已完成：耗时 ${minutes} 分钟`;
    }

    if (task.status === 'error' && task.started_at && task.ended_at) {
      const startedAt = new Date(task.started_at);
      const endedAt = new Date(task.ended_at);
      const seconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
      if (seconds < 60) {
        return `失败：耗时 ${seconds} 秒`;
      }
      const minutes = Math.floor(seconds / 60);
      return `失败：耗时 ${minutes} 分钟`;
    }

    if (task.status === 'canceled' && task.canceled_at) {
      const canceledAt = new Date(task.canceled_at);
      return `已取消：${formatDistanceToNow(canceledAt, { locale, addSuffix: true })}`;
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

        // Check if user is owner
        const memberResponse = await http.get(
          `/namespaces/${namespaceId}/members/${userId}`,
          { mute: true }
        );
        setIsOwner(memberResponse?.role === 'owner');

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
  const showViewFilter = isOwner && memberCount > 1;

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
    <div className="space-y-4 p-px">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-base font-semibold text-foreground">
            {t('tasks.title')}
          </h3>
          {showViewFilter && (
            <Select value={viewFilter} onValueChange={handleViewFilterChange}>
              <SelectTrigger className="h-[30px] w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="own">{t('tasks.my_tasks')}</SelectItem>
                <SelectItem value="all">{t('tasks.all_tasks')}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <Button size="sm" className="text-sm font-semibold" onClick={handleRefresh}>
          {t('common.refresh')}
        </Button>
      </div>

      <div className="w-full rounded-md border border-border">
        <div className="flex h-10 items-center border-b border-border px-8 text-sm font-medium text-muted-foreground">
          <div className="w-[81px] whitespace-nowrap">{t('tasks.function')}</div>
          <div className="ml-6 w-7 whitespace-nowrap">{t('tasks.status')}</div>
          <div className="ml-7 w-[119px] whitespace-nowrap">
            {t('tasks.time') || '时间'}
          </div>
          <div className="ml-auto w-16 whitespace-nowrap">
            {t('common.actions')}
          </div>
        </div>

        <div>
          {tasks.map(task => (
            <div
              key={task.id}
              className="flex h-14 items-center border-b border-border px-8 last:border-b-0"
            >
              <div className="w-[81px]">
                <TaskTypeBadge functionName={task.function} />
              </div>

              <div className="ml-6 w-7">
                <TaskStatusBadge status={task.status as any} />
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="ml-7 w-[119px] cursor-default text-xs font-medium text-muted-foreground">
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

              <div className="ml-auto w-16">
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
