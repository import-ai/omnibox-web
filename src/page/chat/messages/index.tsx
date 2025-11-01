import React from 'react';

import { MessageOperator } from '@/page/chat/conversation/message-operator';
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

interface IProps {
  conversation: ConversationDetail;
  messages: MessageDetail[];
  messageOperator: MessageOperator;
  onRegenerate: (messageId: string) => void;
  onEdit: (messageId: string, newContent: string) => void;
}

function renderMessage(
  message: MessageDetail,
  messages: MessageDetail[],
  citations: Citation[],
  conversation: ConversationDetail,
  messageOperator: MessageOperator,
  onRegenerate: (messageId: string) => void,
  onEdit: (messageId: string, newContent: string) => void
) {
  const openAIMessage = message.message;

  if (openAIMessage.role === OpenAIMessageRole.USER) {
    return (
      <UserMessage
        message={message}
        messageOperator={messageOperator}
        onEdit={onEdit}
      />
    );
  }
  if (openAIMessage.role === OpenAIMessageRole.ASSISTANT) {
    return (
      <AssistantMessage
        message={message}
        messages={messages}
        citations={citations}
        conversation={conversation}
        messageOperator={messageOperator}
        onRegenerate={onRegenerate}
      />
    );
  }
  if (openAIMessage.role === OpenAIMessageRole.TOOL) {
    return <ToolMessage citations={citations} message={message} />;
  }
  return <></>;
}

export function Messages(props: IProps) {
  const { messages, conversation, messageOperator, onRegenerate, onEdit } =
    props;
  const citations = React.useMemo((): Citation[] => {
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

  return (
    <div className="space-y-4">
      {messages
        .filter(message => message.message.role !== OpenAIMessageRole.SYSTEM)
        .map((message, index) => {
          return (
            <div key={message.id}>
              {renderMessage(
                message,
                messages,
                citations,
                conversation,
                messageOperator,
                onRegenerate,
                onEdit
              )}
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
