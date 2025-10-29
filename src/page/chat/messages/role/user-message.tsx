import { Check, X } from 'lucide-react';
import { useState } from 'react';

import Copy from '@/components/copy';
import ReEdit from '@/components/reedit';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChatActionType } from '@/page/chat/chat-input/types';
import {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/types/conversation';

interface IProps {
  message: MessageDetail;
  conversation: ConversationDetail;
  onAction?: (
    action?: ChatActionType,
    reValue?: string,
    parentMessageId?: string
  ) => void;
}

export function UserMessage(props: IProps) {
  const { message, onAction } = props;
  const openAIMessage = message.message;
  const lines = openAIMessage.content?.split('\n') || [];

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(openAIMessage.content || '');

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(openAIMessage.content || '');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(openAIMessage.content || '');
  };

  const handleSubmit = () => {
    if (editValue.trim() && onAction) {
      // 传入当前消息的 parent_id，这样新消息会成为兄弟节点
      onAction(undefined, editValue.trim(), message.parent_id || undefined);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col items-end w-full">
        <div className="w-full sm:w-[75%]">
          <textarea
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            className={cn(
              'w-full min-h-[100px] rounded-lg px-3 py-2 resize-y',
              'bg-secondary text-secondary-foreground dark:bg-[#303030]',
              'border border-border focus:outline-none focus:ring-2 focus:ring-ring'
            )}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
              if (e.key === 'Escape') {
                handleCancel();
              }
            }}
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleSubmit}>
              <Check className="w-4 h-4 mr-1" />
              提交
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-1" />
              取消
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col items-end">
      <div
        className={cn(
          'flex w-fit sm:max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2',
          'ml-auto bg-secondary text-secondary-foreground dark:bg-[#303030]'
        )}
      >
        {lines.map((line, idx) => (
          <span key={idx} className="break-words">
            {line}
            {idx !== lines.length - 1 && <br />}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <div className="group-hover:opacity-100 opacity-0">
          <Copy content={openAIMessage.content || ''} />
          <ReEdit onEdit={handleEdit} />
        </div>
      </div>
    </div>
  );
}
