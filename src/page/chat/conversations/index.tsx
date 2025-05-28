import EditHistory from './edit';
import RemoveHistory from './remove';
import useContext from './useContext';
import { MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { groupItemsByTimestamp } from '../utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';

export default function ChatConversationsPage() {
  const navigate = useNavigate();
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
        <h1 className="text-2xl font-medium text-gray-900 mb-4">历史对话</h1>
      </div>
      <ScrollArea className="h-[calc(100vh-150px)]">
        <div className="space-y-6">
          {data.length > 0 ? (
            groupItemsByTimestamp(data).map(([key, items]) => (
              <div key={key}>
                <div className="pb-4">
                  <p className="text-sm text-gray-500">{key}</p>
                </div>
                {items.map((item) => (
                  <div
                    className="cursor-pointer group"
                    key={item.id}
                    onClick={() => {
                      navigate(`/${namespaceId}/chat/${item.id}`);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                        {item.title}
                      </h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-gray-400 hover:bg-gray-100"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="bottom" align="end">
                          <DropdownMenuItem
                            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-400"
                            onClick={() => {
                              onEdit({
                                id: item.id,
                                title: item.title,
                                open: true,
                              });
                            }}
                          >
                            重命名
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-red-500 hover:bg-gray-100 dark:hover:bg-gray-400"
                            onClick={() => {
                              onRemove({
                                id: item.id,
                                open: true,
                              });
                            }}
                          >
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
                      {/* {item.messages.length > 0
                        ? item.messages[item.messages.length - 1].message
                            .content
                        : '暂无消息'} */}
                    </p>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="text-gray-500">
              <p>暂无历史对话</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
