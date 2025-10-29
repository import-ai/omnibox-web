import { Check, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import BranchNavigator from '@/components/branch-navigator';
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
  onBranchNavigate?: (parentMessageId: string, userMessageId: string) => void;
}

export function UserMessage(props: IProps) {
  const { message, conversation, onAction, onBranchNavigate } = props;
  const openAIMessage = message.message;
  const lines = openAIMessage.content?.split('\n') || [];

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(openAIMessage.content || '');

  // 计算用户消息的分支信息：检测是否有多个编辑版本
  const branchInfo = useMemo(() => {
    const parentId = message.parent_id;
    if (!parentId) return null;

    const parentMessage = conversation.mapping[parentId];
    if (!parentMessage) return null;

    // 获取父节点的所有 user 子节点（编辑产生的多个版本）
    const userSiblings = parentMessage.children
      .map(childId => conversation.mapping[childId])
      .filter(child => child?.message.role === 'user') as MessageDetail[];

    // 如果只有一个版本，不需要分页器
    if (userSiblings.length <= 1) return null;

    // 找到当前消息在兄弟节点中的索引
    const currentIndex = userSiblings.findIndex(
      sibling => sibling.id === message.id
    );
    if (currentIndex === -1) return null;

    return {
      parentMessageId: parentId,
      siblings: userSiblings,
      currentIndex,
      totalCount: userSiblings.length,
    };
  }, [message, conversation]);

  // 处理分页器点击
  const handleBranchNavigate = (index: number) => {
    if (!branchInfo || !onBranchNavigate) return;
    const targetUser = branchInfo.siblings[index];
    if (targetUser) {
      onBranchNavigate(branchInfo.parentMessageId, targetUser.id);
    }
  };

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
      // 形成类似 ChatGPT 的编辑版本功能
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
        {branchInfo && (
          <BranchNavigator
            currentIndex={branchInfo.currentIndex}
            totalCount={branchInfo.totalCount}
            onNavigate={handleBranchNavigate}
          />
        )}
        <div className="group-hover:opacity-100 opacity-0">
          <Copy content={openAIMessage.content || ''} />
          <ReEdit onEdit={handleEdit} />
        </div>
      </div>
    </div>
  );
}
