import { RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ChatActionType } from '@/page/chat/chat-input/types';
import { ConversationDetail } from '@/page/chat/types/conversation';
import { findNearestUserParent } from '@/page/chat/utils';

import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface IProps {
  messageId: string;
  conversation: ConversationDetail;
  onAction: (
    action?: ChatActionType,
    reValue?: string,
    parentMessageId?: string
  ) => void;
}

function Retry(props: IProps) {
  const { t } = useTranslation();

  const { messageId, conversation, onAction } = props;

  // 从 conversation 中构建 messages 列表
  const messages = useMemo(() => {
    return Object.values(conversation.mapping || {});
  }, [conversation]);

  console.log('conversationconversation', { conversation, messages });
  const handleRetry = async () => {
    const parentMessage = findNearestUserParent(messages as any, messageId);

    if (parentMessage?.message.content) {
      // 传入 parentMessage 的 id，这样新的 assistant 回答会成为兄弟节点
      onAction(undefined, parentMessage.message.content, parentMessage.id);
    }
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={handleRetry}
          size="icon"
          variant="ghost"
          className="p-0 w-7 h-7"
        >
          <RotateCcw />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{t('retry_answer')}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default Retry;
