import { Loader2Icon } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { CitationMarkdown } from '@/page/chat/messages/citations/citation-markdown.tsx';
import type { Citation } from '@/page/chat/types/chat-response';
import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/types/chat-response';
import type {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/types/conversation';

import { ChatActionType } from '../../chat-input/types';

interface IProps {
  conversation: ConversationDetail;
  message: MessageDetail;
  messages: MessageDetail[];
  citations: Citation[];
  onAction: (
    action?: ChatActionType,
    reValue?: string,
    parentMessageId?: string
  ) => void;
  onBranchNavigate?: (
    userMessageId: string,
    assistantMessageId: string
  ) => void;
}

export function AssistantMessage(props: IProps) {
  const {
    message,
    citations,
    messages,
    conversation,
    onAction,
    onBranchNavigate,
  } = props;

  const { t } = useTranslation();
  const openAIMessage = message.message;
  const [currentIndex, setCurrentIndex] = useState(0);
  // 计算分支信息：检测是否有多个回答可以切换
  const branchInfo = useMemo(() => {
    // 找到父用户消息
    const parentId = message.parent_id;
    if (!parentId) return null;

    const parentMessage = conversation.mapping[parentId];
    if (!parentMessage || parentMessage.message.role !== 'user') return null;

    // 获取父用户消息的所有 assistant 子节点
    const assistantSiblings = parentMessage.children
      .map(childId => conversation.mapping[childId])
      .filter(child => child?.message.role === 'assistant') as MessageDetail[];

    // 如果只有一个回答，不需要分页器
    if (assistantSiblings.length <= 1) return null;

    // 找到当前消息在兄弟节点中的索引
    const currentIndex = assistantSiblings.findIndex(
      sibling => sibling.id === message.id
    );
    if (currentIndex === -1) return null;

    return {
      userMessageId: parentId,
      siblings: assistantSiblings,
      currentIndex,
      totalCount: assistantSiblings.length,
    };
  }, [message, conversation]);

  // 处理分页器点击
  const handleBranchNavigate = (index: number) => {
    if (!branchInfo || !onBranchNavigate) return;
    const targetAssistant = branchInfo.siblings[index];
    if (targetAssistant) {
      onBranchNavigate(branchInfo.userMessageId, targetAssistant.id);
    }
  };

  const domList: React.ReactNode[] = [];
  if (openAIMessage.reasoning_content?.trim()) {
    domList.push(
      <Accordion
        type="single"
        collapsible
        key="reasoning"
        defaultValue={message.id}
        className="mb-3"
      >
        <AccordionItem value={message.id}>
          <AccordionTrigger>{t('chat.tools.reasoning')}</AccordionTrigger>
          <AccordionContent className="text-gray-500 dark:text-gray-400">
            {openAIMessage.reasoning_content?.trim()}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }
  if (openAIMessage.content?.trim()) {
    domList.push(
      <CitationMarkdown
        key="content"
        status={message.status}
        content={openAIMessage.content?.trim()}
        citations={citations}
        conversation={conversation}
        messageId={message.id}
        onAction={onAction}
        handleBranchNavigate={handleBranchNavigate}
        currentIndex={currentIndex}
        setCurrentIndex={setCurrentIndex}
      />
    );
  }
  if (openAIMessage.tool_calls) {
    const lastMessage = messages[messages.length - 1];
    domList.push(
      <div
        key="tool-calls"
        hidden={
          lastMessage.id !== message.id &&
          !(
            lastMessage.message.role === OpenAIMessageRole.TOOL &&
            lastMessage.status === MessageStatus.PENDING
          )
        }
      >
        <Button disabled size="sm" variant="secondary">
          <Loader2Icon className="animate-spin" />
          {t('chat.searching')}
        </Button>
      </div>
    );
  }
  return (
    <div className="group">{domList.length === 1 ? domList[0] : domList}</div>
  );
}
