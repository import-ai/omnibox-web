import {
  Edit2,
  History,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';

import { PlusIcon } from './plus';

interface IProps {
  data: string;
  conversationId: string;
  conversationsPage: boolean;
  namespaceId: string;
}

export default function Actions(props: IProps) {
  const { data, conversationId, conversationsPage, namespaceId } = props;
  const app = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [remove, onRemove] = useState(false);
  const [removeLoading, onRemoveLoading] = useState(false);
  const onDeleteCancel = () => {
    onRemove(false);
  };
  const onDeleteOk = () => {
    onRemoveLoading(true);
    http
      .delete(`/namespaces/${namespaceId}/conversations/${conversationId}`)
      .then(() => {
        onRemoveLoading(false);
        onRemove(false);
        navigate(`/${namespaceId}/chat/conversations`);
        toast(t('chat.conversations.deleted'), {
          description: t('chat.conversations.deleted_description'),
          action: {
            label: t('undo'),
            onClick: () => {
              http
                .post(
                  `/namespaces/${namespaceId}/conversations/${conversationId}/restore`
                )
                .then(response => {
                  navigate(`/${namespaceId}/chat/${response.id}`);
                });
            },
          },
        });
      });
  };
  const onChatHistory = () => {
    navigate(`/${namespaceId}/chat/conversations`);
  };
  const onChatCreate = () => {
    navigate(`/${namespaceId}/chat`);
  };
  const handleAction = (id: string) => {
    if (id === 'rename') {
      app.fire('chat:title:edit');
      return;
    }
    if (id === 'delete') {
      onRemove(true);
      return;
    }
  };

  return (
    <div className="flex items-center gap-1 text-sm">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="size-[28px]"
            onClick={onChatCreate}
          >
            <PlusIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('chat.conversations.new_chat')}</TooltipContent>
      </Tooltip>
      {!conversationsPage && !conversationId && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#585D65] size-[28px]"
              onClick={onChatHistory}
            >
              <History />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('chat.conversations.history')}</TooltipContent>
        </Tooltip>
      )}
      {conversationId && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 data-[state=open]:bg-accent"
            >
              <MoreHorizontal />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-56 overflow-hidden rounded-lg p-0"
            align="end"
          >
            <Sidebar collapsible="none" className="bg-transparent">
              <SidebarContent className="gap-0">
                <SidebarGroup className="border-b">
                  <SidebarGroupContent className="gap-0">
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton onClick={onChatCreate}>
                          <Plus />
                          <span>{t('chat.conversations.new_chat')}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton onClick={onChatHistory}>
                          <History />
                          <span>{t('chat.conversations.history')}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleAction('rename')}
                        >
                          <Edit2 />
                          <span>{t('chat.conversations.rename.option')}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleAction('delete')}
                        >
                          <Trash2 />
                          <span>{t('chat.conversations.delete.option')}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
          </PopoverContent>
        </Popover>
      )}
      <AlertDialog open={remove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('chat.conversations.delete.dialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans
                i18nKey="chat.conversations.delete.dialog.description"
                values={{ title: data }}
                components={{
                  strong: <strong className="font-bold" />,
                }}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onDeleteCancel}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white"
              disabled={removeLoading}
              onClick={onDeleteOk}
            >
              {removeLoading && (
                <LoaderCircle className="transition-transform animate-spin" />
              )}
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
