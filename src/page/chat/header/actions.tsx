import { Edit2, History, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useChatStore } from '@/page/chat/chat-store';

import { PlusIcon } from './plus';

interface IProps {
  homePage: boolean;
  chatTitle: string;
  conversationId: string;
  conversationsPage: boolean;
  namespaceId: string;
}

export default function Actions(props: IProps) {
  const {
    homePage,
    chatTitle,
    conversationId,
    conversationsPage,
    namespaceId,
  } = props;
  const clearContext = useChatStore(state => state.clearContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [remove, onRemove] = useState(false);

  const handleDeleteSuccess = () => {
    navigate(`/${namespaceId}/chat/conversations`);
  };

  const handleRestoreSuccess = (response: any) => {
    navigate(`/${namespaceId}/chat/${response.id}`);
  };
  const onChatHistory = () => {
    navigate(`/${namespaceId}/chat/conversations`);
  };
  const onChatCreate = () => {
    clearContext();
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
      {!homePage && (
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
      )}
      {!conversationsPage && !conversationId && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#585D65] size-[28px] dark:text-white"
              onClick={onChatHistory}
            >
              <History />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('chat.conversations.history')}</TooltipContent>
        </Tooltip>
      )}
      {conversationId && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 data-[state=open]:bg-accent"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={onChatCreate}
            >
              <Plus className="size-4 text-neutral-500 dark:text-[#a1a1a1]" />
              <span>{t('chat.conversations.new_chat')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={onChatHistory}
            >
              <History className="size-4 text-neutral-500 dark:text-[#a1a1a1]" />
              <span>{t('chat.conversations.history')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => handleAction('rename')}
            >
              <Edit2 className="size-4 text-neutral-500 dark:text-[#a1a1a1]" />
              <span>{t('chat.conversations.rename.option')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => handleAction('delete')}
            >
              <Trash2 className="size-4 text-neutral-500 dark:text-[#a1a1a1]" />
              <span>{t('chat.conversations.delete.option')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <ConfirmDeleteDialog
        open={remove}
        targetName={t('chat.conversations.name')}
        itemTitle={chatTitle}
        deleteUrl={`/namespaces/${namespaceId}/conversations/${conversationId}`}
        restoreUrl={`/namespaces/${namespaceId}/conversations/${conversationId}/restore`}
        successMessage={t('chat.conversations.deleted')}
        successDescription={t('chat.conversations.deleted_description')}
        onOpenChange={onRemove}
        onSuccess={handleDeleteSuccess}
        onRestoreSuccess={handleRestoreSuccess}
      />
    </div>
  );
}
