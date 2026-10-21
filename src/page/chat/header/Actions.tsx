import {
  History,
  MessageCirclePlus,
  MoreHorizontal,
  Plus,
  Search,
  SquarePen,
  Trash,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { ShareIcon } from '@/assets/icons/ShareIcon';
import { Button } from '@/components/Button';
import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import {
  IconButton,
  sidebarToolbarIconButtonClassName,
} from '@/components/omnibox/IconButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import useApp from '@/hooks/useApp';
import { resetChatForNamespaceSwitch } from '@/lib/chatBridge';
import { cn } from '@/lib/utils';
import { clearChatInputDraft } from '@/page/chat/chat-input/chatInputDraft';
import { CONVERSATION_SHARE_OPEN_EVENT } from '@/page/chat/share/conversationShareEvents';
import { navigateToResource } from '@/page/resource/resourceNavigation';
import { useMenuTriggerPress } from '@/page/sidebar/components/resource-tree/menuTriggerPress';

interface IProps {
  compact?: boolean;
  homePage: boolean;
  chatTitle: string;
  conversationId: string;
  conversationsPage: boolean;
  namespaceId: string;
  onChatCreate?: () => void;
  onChatHistory?: () => void;
  onChatSearch?: () => void;
}

export default function Actions(props: IProps) {
  const {
    homePage,
    compact = false,
    chatTitle,
    conversationId,
    conversationsPage,
    namespaceId,
    onChatCreate: onChatCreateOverride,
    onChatHistory: onChatHistoryOverride,
    onChatSearch,
  } = props;
  const app = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [remove, onRemove] = useState(false);
  const menuTriggerPress = useMenuTriggerPress();
  const renaming = useRef(false);

  const handleDeleteSuccess = () => {
    navigateToResource(navigate, `/${namespaceId}/chat/conversations`);
  };

  const handleRestoreSuccess = (response: any) => {
    navigateToResource(navigate, `/${namespaceId}/chat/${response.id}`);
  };
  const onChatHistory = () => {
    if (onChatHistoryOverride) {
      onChatHistoryOverride();
      return;
    }
    navigateToResource(navigate, `/${namespaceId}/chat/conversations`);
  };
  const onChatCreate = () => {
    if (onChatCreateOverride) {
      onChatCreateOverride();
      return;
    }
    if (conversationId) clearChatInputDraft(conversationId);
    resetChatForNamespaceSwitch(namespaceId);
    navigateToResource(navigate, `/${namespaceId}/chat`);
  };
  const handleAction = (id: string) => {
    if (id === 'rename') {
      renaming.current = true;
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
      {conversationsPage && onChatSearch && (
        <IconButton
          label={t('chat.conversations.search')}
          size="sm"
          tone="sidebar"
          onClick={onChatSearch}
        >
          <Search className="size-4" />
        </IconButton>
      )}
      {conversationId && !compact && (
        <IconButton
          label={t('chat.share.action')}
          size="sm"
          tone="sidebar"
          onClick={() =>
            app.fire(CONVERSATION_SHARE_OPEN_EVENT, {
              conversationId,
              initialSelection: 'all',
            })
          }
        >
          <ShareIcon className="size-4" />
        </IconButton>
      )}
      {!homePage && (
        <IconButton
          label={t('chat.conversations.new_chat')}
          size="sm"
          tone="sidebar"
          onClick={onChatCreate}
        >
          <MessageCirclePlus className="size-4" />
        </IconButton>
      )}
      {!conversationsPage && (compact || !conversationId) && (
        <IconButton
          label={t('chat.conversations.history')}
          size="sm"
          tone="sidebar"
          onClick={onChatHistory}
        >
          <History className="size-4" />
        </IconButton>
      )}
      {conversationId && !compact && (
        <DropdownMenu>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild {...menuTriggerPress.triggerProps}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    sidebarToolbarIconButtonClassName,
                    'size-7 aria-expanded:bg-transparent'
                  )}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{t('common.more_actions')}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent
            align="end"
            className="w-56"
            {...menuTriggerPress.contentProps}
            onCloseAutoFocus={event => {
              menuTriggerPress.contentProps.onCloseAutoFocus(event);
              if (renaming.current) event.preventDefault();
              renaming.current = false;
            }}
          >
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={onChatCreate}
            >
              <Plus className="size-4 text-muted-foreground" />
              <span>{t('chat.conversations.new_chat')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={onChatHistory}
            >
              <History className="size-4 text-muted-foreground" />
              <span>{t('chat.conversations.history')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => handleAction('rename')}
            >
              <SquarePen className="size-4 text-muted-foreground" />
              <span>{t('chat.conversations.rename.option')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer gap-2"
              onClick={() => handleAction('delete')}
            >
              <Trash className="size-4" />
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
