import EditHistory from './edit';
import RemoveHistory from './remove';
import useContext from './useContext';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { groupItemsByTimestamp } from '../utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

export default function ChatConversationsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    data,
    edit,
    onEdit,
    remove,
    onRemove,
    onEditDone,
    namespaceId,
    onEditChange,
    onRemoveDone,
    onRemoveChange,
  } = useContext();

  return (
    <div>
      <EditHistory
        data={edit}
        onFinish={onEditDone}
        namespaceId={namespaceId}
        onOpenChange={onEditChange}
      />
      <RemoveHistory
        data={remove}
        onFinish={onRemoveDone}
        namespaceId={namespaceId}
        onOpenChange={onRemoveChange}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-medium mb-4">
          {t('chat.conversations.history')}
        </h1>
      </div>
      <ScrollArea className="h-[calc(100vh-150px)]">
        <div className="space-y-6">
          {data.length > 0 ? (
            groupItemsByTimestamp(data).map(([key, items]) => (
              <div key={key}>
                <div className="pb-4">
                  <p className="text-sm text-muted-foreground font-light ml-0.5">
                    {key}
                  </p>
                </div>

                {items.map((item, index) => {
                  const conversationTitle: string =
                    item.title ||
                    item.user_content ||
                    t('chat.conversations.new');
                  return (
                    <div
                      className="cursor-pointer group"
                      key={item.id}
                      onClick={() => {
                        navigate(`/${namespaceId}/chat/${item.id}`);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium group-hover:text-blue-500">
                          {conversationTitle}
                        </h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="bottom" align="end">
                            <DropdownMenuItem
                              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-400"
                              onClick={(event) => {
                                event.stopPropagation();
                                event.preventDefault();
                                onEdit({
                                  id: item.id,
                                  title: conversationTitle,
                                  open: true,
                                });
                              }}
                            >
                              {t('rename')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer text-red-500 hover:bg-gray-100 dark:hover:bg-gray-400"
                              onClick={(event) => {
                                event.stopPropagation();
                                event.preventDefault();
                                onRemove({
                                  id: item.id,
                                  title: conversationTitle,
                                  open: true,
                                });
                              }}
                            >
                              {t('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-muted-foreground text-sm line-clamp-4 leading-relaxed">
                        {item.assistant_content?.replace(/\[\[\d+]]/g, '') ||
                          '...'}
                      </p>
                      {index < items.length - 1 && (
                        <Separator className="my-4" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="text-gray-500">
              <p>{t('chat.conversations.empty')}</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
