import copy from 'copy-to-clipboard';
import { ChevronRight, Copy, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Group, Member } from '@/interface';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';

import { useSettingsToast } from '../../settings-toast';
import DataGroupUser from './data-user';
import useGroupUser from './use-group-user';

interface GroupProps extends Group {
  member: Array<Member>;
  onEdit: (id: string, title: string) => void;
  refetch: () => void;
  namespace_id: string;
}

export default function GroupData(props: GroupProps) {
  const { id, title, member, namespace_id, refetch, invitation_id, onEdit } =
    props;
  const { t } = useTranslation();
  const { showToast } = useSettingsToast();
  const [fold, onFold] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { groupUserData, onRemove, groupUserRefetch } = useGroupUser({
    group_id: id,
    namespace_id,
  });

  const handleCopyLink = () => {
    if (!invitation_id) return;
    try {
      const success = copy(
        `${location.origin}/invite/${namespace_id}/${invitation_id}`,
        { format: 'text/plain' }
      );
      if (success) {
        showToast(t('actions.copy_link_success'), 'success');
      } else {
        showToast(t('actions.copy_link_failed'), 'error');
      }
    } catch {
      showToast(t('actions.copy_link_failed'), 'error');
    }
  };

  const handleDelete = () => {
    setDeleting(true);
    http
      .delete(`/namespaces/${namespace_id}/groups/${id}`)
      .then(() => {
        refetch();
      })
      .finally(() => {
        setDeleting(false);
      });
  };

  const handleCheckedChange = (checked: boolean) => {
    if (loading) {
      return;
    }
    setLoading(true);
    if (checked) {
      http
        .post(`/namespaces/${namespace_id}/invitations`, {
          groupId: id,
        })
        .then(refetch)
        .finally(() => {
          setLoading(false);
        });
    } else {
      http
        .delete(`/namespaces/${namespace_id}/invitations/${invitation_id}`)
        .then(refetch)
        .finally(() => {
          setLoading(false);
        });
    }
  };

  return (
    <Collapsible
      open={fold}
      onOpenChange={onFold}
      className={cn({
        '[&[data-state=open]>div>div>svg:first-child]:rotate-90': fold,
      })}
    >
      <div className="flex h-[50px] lg:h-[60px] items-center border-b border-border">
        <div className="flex w-[100px] lg:w-[210px] items-center px-2 whitespace-nowrap">
          <CollapsibleTrigger asChild>
            <ChevronRight className="mr-2 size-4 flex-shrink-0 cursor-pointer transition-transform" />
          </CollapsibleTrigger>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm">{title}</span>
          </div>
        </div>
        <div className="w-[80px] lg:w-[115px] px-2 whitespace-nowrap">
          <span className="text-sm text-muted-foreground">
            {t('manage.member_count', { size: groupUserData.length })}
          </span>
        </div>
        <div className="flex w-[60px] lg:w-[127px] items-center justify-center whitespace-nowrap">
          <Switch
            checked={Boolean(invitation_id)}
            onCheckedChange={handleCheckedChange}
          />
        </div>
        <div className="flex flex-1 items-center justify-end gap-2 lg:gap-4 px-2">
          {/* Copy link - always reserve space, only show icon when invitation is enabled */}
          <div className="w-4">
            {invitation_id && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center justify-center transition-opacity hover:opacity-70"
                  >
                    <Copy className="size-4 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {t('actions.copy_link')}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Edit */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onEdit(id, title)}
                className="flex items-center justify-center transition-opacity hover:opacity-70"
              >
                <Pencil className="size-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{t('edit')}</TooltipContent>
          </Tooltip>

          {/* Delete */}
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <button className="flex items-center justify-center transition-opacity hover:opacity-70">
                    <Trash2 className="size-4 text-muted-foreground" />
                  </button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">{t('delete')}</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('manage.remove_title')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('manage.remove_desc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('ok')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <CollapsibleContent>
        <Separator />
        <DataGroupUser
          group_id={id}
          member={member}
          onRemove={onRemove}
          groupUserData={groupUserData}
          groupUserRefetch={groupUserRefetch}
          namespace_id={namespace_id}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
