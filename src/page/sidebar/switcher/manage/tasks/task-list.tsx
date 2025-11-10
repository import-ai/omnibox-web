import { format, isValid } from 'date-fns';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">{t('tasks.title')}</h3>
          {showViewFilter && (
            <Select value={viewFilter} onValueChange={handleViewFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="own">{t('tasks.my_tasks')}</SelectItem>
                <SelectItem value="all">{t('tasks.all_tasks')}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
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
            <TooltipProvider>
              {tasks.map(task => (
                <Tooltip key={task.id}>
                  <TooltipTrigger asChild>
                    <TableRow className="cursor-default">
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
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {t('tasks.task_id')}: {task.id}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </TableBody>
        </Table>
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
