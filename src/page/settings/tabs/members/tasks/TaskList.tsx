import { format, formatDistanceToNow } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import Loading from '@/components/loading';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/omnibox/Select';
import { SettingPageButton } from '@/components/omnibox/SettingPageButton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Task } from '@/interface';
import { http } from '@/lib/request';

import { TaskActions } from './TaskActions';
import { TaskPagination } from './TaskPagination';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskTypeBadge } from './TaskTypeBadge';

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
        mute: true,
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

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex w-full shrink-0 items-center justify-between gap-2 lg:mb-4">
        <div className="flex items-center gap-2 lg:gap-4">
          {showViewFilter && (
            <Select
              value={viewFilter}
              onValueChange={handleViewFilterChange}
              disabled={loading}
            >
              <SelectTrigger className="w-[100px] lg:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="own">{t('tasks.my_tasks')}</SelectItem>
                <SelectItem value="all">{t('tasks.all_tasks')}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <SettingPageButton onClick={handleRefresh} disabled={loading}>
          {t('common.refresh')}
        </SettingPageButton>
      </div>

      <div
        aria-busy={loading}
        className="min-h-0 max-w-[83vw] flex-1 overflow-auto rounded-md border border-border sm:max-w-full"
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>{t('tasks.function')}</TableHead>
              <TableHead className="text-center">{t('tasks.status')}</TableHead>
              <TableHead>{t('tasks.time')}</TableHead>
              <TableHead className="text-right">
                {t('common.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40">
                  <Loading />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Alert variant="destructive" className="text-center">
                    <AlertDescription>{error}</AlertDescription>
                    <Button
                      variant="outline"
                      onClick={handleRefresh}
                      className="mt-2"
                    >
                      {t('common.retry')}
                    </Button>
                  </Alert>
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-40 text-center text-muted-foreground"
                >
                  <p>{t('tasks.no_tasks')}</p>
                  <p className="mt-2">{t('tasks.empty_description')}</p>
                </TableCell>
              </TableRow>
            ) : (
              tasks.map(task => (
                <TableRow key={task.id} className="h-14">
                  <TableCell>
                    <TaskTypeBadge functionName={task.function} />
                  </TableCell>

                  <TableCell>
                    <div className="flex justify-center">
                      <TaskStatusBadge status={task.status as any} />
                    </div>
                  </TableCell>

                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-muted-foreground">
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
                  </TableCell>

                  <TableCell>
                    <div className="flex justify-end">
                      <TaskActions
                        task={task}
                        namespaceId={namespaceId}
                        onTaskUpdated={fetchTasks}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div inert={loading} className="shrink-0">
          <TaskPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
