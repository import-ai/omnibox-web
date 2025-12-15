import { ExternalLink, LoaderCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { StopIcon } from '@/assets/icons/stop';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Task } from '@/interface.ts';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';

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

  const canCancel = task.can_cancel;
  const canRerun = task.can_rerun;
  const canRedirect = task.can_redirect;

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
            {canRedirect && task.attrs?.resource_id ? (
              <Link
                to={`/${namespaceId}/${task.attrs.resource_id}`}
                reloadDocument
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
      <AlertDialog>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <button
                  disabled={isLoading || !canCancel}
                  className={cn(
                    'flex items-center justify-center transition-opacity disabled:opacity-40',
                    canCancel
                      ? 'hover:opacity-70'
                      : 'cursor-not-allowed opacity-40'
                  )}
                >
                  <StopIcon className="size-3.5 text-muted-foreground" />
                </button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">{t('cancel')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('tasks.confirm_cancel_title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('tasks.confirm_cancel_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('tasks.continue_running')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCancel}
            >
              {isLoading && (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              )}
              {t('tasks.confirm_cancel')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={canRerun ? handleRerun : undefined}
              disabled={isLoading || !canRerun}
              className={cn(
                'flex items-center justify-center transition-opacity disabled:opacity-40',
                canRerun ? 'hover:opacity-70' : 'cursor-not-allowed opacity-40'
              )}
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
