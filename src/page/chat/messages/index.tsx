import React from 'react';

import { addMessage } from '@/model/message';
import { AssistantMessage } from '@/page/chat/messages/role/assistant-message';
import { ToolMessage } from '@/page/chat/messages/role/tool-message';
import { UserMessage } from '@/page/chat/messages/role/user-message';
import {
  type Citation,
  OpenAIMessageRole,
} from '@/page/chat/types/chat-response';
import type {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/types/conversation';

import { ChatActionType } from '../chat-input/types';

interface IProps {
  conversation: ConversationDetail;
  messages: MessageDetail[];
  onAction: (
    action?: ChatActionType,
    reValue?: string,
    parentMessageId?: string
  ) => void;
  onBranchNavigate?: (
    userMessageId: string,
    assistantMessageId: string
  ) => void;
  onUserBranchNavigate?: (
    parentMessageId: string,
    userMessageId: string
  ) => void;
}

export function Messages(props: IProps) {
  const {
    messages,
    conversation,
    onAction,
    onBranchNavigate,
    onUserBranchNavigate,
  } = props;

  const citations = React.useMemo((): Citation[] => {
    // 添加会话消息到全局状态
    addMessage(messages);
    const result: Citation[] = [];
    for (const message of messages) {
      if (message.attrs?.citations && message.attrs.citations.length > 0) {
        message.attrs.citations.forEach(citation => {
          result.push({ ...citation, id: message.id });
        });
      }
    }
    return result;
  }, [messages]);

  function renderMessage(message: MessageDetail) {
    const openAIMessage = message.message;

    if (openAIMessage.role === OpenAIMessageRole.USER) {
      return (
        <UserMessage
          message={message}
          conversation={conversation}
          onAction={onAction}
          onBranchNavigate={onUserBranchNavigate}
        />
      );
    }
    if (openAIMessage.role === OpenAIMessageRole.ASSISTANT) {
      return (
        <AssistantMessage
          onAction={onAction}
          message={message}
          messages={messages}
          citations={citations}
          conversation={conversation}
          onBranchNavigate={onBranchNavigate}
        />
      );
    }
    if (openAIMessage.role === OpenAIMessageRole.TOOL) {
      return <ToolMessage citations={citations} message={message} />;
    }
  }

  return (
    <div className="space-y-4">
      {messages
        .filter(message => message.message.role !== OpenAIMessageRole.SYSTEM)
        .map((message, index) => {
          return (
            <div key={message.id}>
              {renderMessage(message)}
              {index < messages.length - 1 &&
                ![OpenAIMessageRole.TOOL, OpenAIMessageRole.USER].includes(
                  message.message.role
                ) && <div className="py-4" />}
            </div>
          );
        })}
    </div>
  );
}
