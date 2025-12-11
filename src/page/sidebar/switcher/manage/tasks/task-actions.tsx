import { ExternalLink, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Task } from '@/interface.ts';
import { http } from '@/lib/request';

// Stop icon: hollow circle with rounded square inside
function StopIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="4.5" y="4.5" width="5" height="5" rx="1" fill="currentColor" />
    </svg>
  );
}

export interface TaskActionsProps {
  task: Task;
  namespaceId: string;
  onTaskUpdated: () => void;
}

export function TaskActions({
  task,
  namespaceId,
  onTaskUpdated,
}: TaskActionsProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const canCancel = task.status === 'pending' || task.status === 'running';
  const canRerun =
    task.status === 'canceled' ||
    task.status === 'error' ||
    task.status === 'finished';

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      await http.patch(`/namespaces/${namespaceId}/tasks/${task.id}/cancel`);
      toast.success(t('tasks.cancel_success'));
      onTaskUpdated();
    } catch (error) {
      toast.error(t('tasks.cancel_error'));
      console.error('Cancel task error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRerun = async () => {
    setIsLoading(true);
    try {
      await http.post(`/namespaces/${namespaceId}/tasks/${task.id}/rerun`);
      toast.success(t('tasks.rerun_success'));
      onTaskUpdated();
    } catch (error) {
      toast.error(t('tasks.rerun_error'));
      console.error('Rerun task error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2.5">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {task.attrs?.resource_id ? (
              <Link
                to={`/${namespaceId}/${task.attrs.resource_id}`}
                className="flex items-center justify-center transition-opacity hover:opacity-70"
              >
                <ExternalLink className="size-4 text-muted-foreground" />
              </Link>
            ) : (
              <span className="flex cursor-not-allowed items-center justify-center opacity-40">
                <ExternalLink className="size-4 text-muted-foreground" />
              </span>
            )}
          </TooltipTrigger>
          <TooltipContent side="top">{t('tasks.view_resource')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={canCancel ? handleCancel : undefined}
              disabled={isLoading || !canCancel}
              className={`flex items-center justify-center transition-opacity disabled:opacity-40 ${
                canCancel ? 'hover:opacity-70' : 'cursor-not-allowed opacity-40'
              }`}
            >
              <StopIcon className="size-3.5 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{t('cancel')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={canRerun ? handleRerun : undefined}
              disabled={isLoading || !canRerun}
              className={`flex items-center justify-center transition-opacity disabled:opacity-40 ${
                canRerun ? 'hover:opacity-70' : 'cursor-not-allowed opacity-40'
              }`}
            >
              <RefreshCw className="size-3.5 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{t('common.retry')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
