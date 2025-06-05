import { useState } from 'react';
import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/i18n/language-toggle';
import { ThemeToggle } from '@/page/resource/theme-toggle';
import {
  Plus,
  Edit2,
  Trash2,
  History,
  LoaderCircle,
  MoreHorizontal,
} from 'lucide-react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';

interface IProps {
  conversationId: string;
  conversationsPage: boolean;
  namespaceId: string;
}

export default function Actions(props: IProps) {
  const { conversationId, conversationsPage, namespaceId } = props;
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
    <div className="flex items-center gap-2 text-sm">
      <LanguageToggle />
      <ThemeToggle />
      {conversationsPage ? (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onChatCreate}
        >
          <Plus />
        </Button>
      ) : (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onChatHistory}
        >
          <History />
        </Button>
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
                        <SidebarMenuButton
                          onClick={() => handleAction('rename')}
                        >
                          <Edit2 />
                          <span>{t('rename')}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => handleAction('delete')}
                        >
                          <Trash2 />
                          <span>{t('delete')}</span>
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
            <AlertDialogTitle>确定删除对话？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后，聊天记录将不可恢复。
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
