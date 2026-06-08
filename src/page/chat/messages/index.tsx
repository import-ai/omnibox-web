import React from 'react';

import { MessageOperator } from '@/page/chat/core/messageOperator.ts';
import {
  type Citation,
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse';
import type {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/core/types/conversation';
import { AssistantMessage } from '@/page/chat/messages/role/AssistantMessage';
import { ToolMessage } from '@/page/chat/messages/role/ToolMessage';
import { UserMessage } from '@/page/chat/messages/role/UserMessage';

interface IProps {
  conversation: ConversationDetail;
  messages: MessageDetail[];
  messageOperator: MessageOperator;
  onRegenerate: (messageId: string) => void;
  onEdit: (messageId: string, newContent: string) => void;
  regeneratingParentId?: string | null;
}

function renderMessage(
  message: MessageDetail,
  messages: MessageDetail[],
  citations: Citation[],
  conversation: ConversationDetail,
  messageOperator: MessageOperator,
  onRegenerate: (messageId: string) => void,
  onEdit: (messageId: string, newContent: string) => void,
  isLastMessage: boolean,
  regeneratingParentId: string | null
) {
  const openAIMessage = message.message;

  if (
    openAIMessage.role === OpenAIMessageRole.USER &&
    (message.attrs?.tool_call?.decisions ?? []).length === 0
  ) {
    return (
      <UserMessage
        message={message}
        messageOperator={messageOperator}
        onEdit={onEdit}
      />
    );
  }
  if (openAIMessage.role === OpenAIMessageRole.ASSISTANT) {
    const parentId = messageOperator.getParent(message.id);
    return (
      <AssistantMessage
        message={message}
        messages={messages}
        citations={citations}
        conversation={conversation}
        messageOperator={messageOperator}
        onRegenerate={onRegenerate}
        isLastMessage={isLastMessage}
        regenerateDisabled={Boolean(regeneratingParentId)}
        regenerating={regeneratingParentId === parentId}
      />
    );
  }
  if (openAIMessage.role === OpenAIMessageRole.TOOL) {
    return <ToolMessage citations={citations} message={message} />;
  }
  return <></>;
}

export function Messages(props: IProps) {
  const {
    messages,
    conversation,
    messageOperator,
    onRegenerate,
    onEdit,
    regeneratingParentId = null,
  } = props;
  const citations = React.useMemo((): Citation[] => {
    const result: Citation[] = [];
    for (const message of messages) {
      if (message.attrs?.citations && message.attrs.citations.length > 0) {
        message.attrs.citations.forEach(citation => {
          result.push(citation);
        });
      }
    }
    return result;
  }, [messages]);

  const filteredMessages = messages.filter(
    message => message.message.role !== OpenAIMessageRole.SYSTEM
  );

  // Find the index of the last assistant message
  const lastAssistantIndex = filteredMessages.reduce((lastIndex, msg, idx) => {
    return msg.message.role === OpenAIMessageRole.ASSISTANT ? idx : lastIndex;
  }, -1);

  return (
    <div className="space-y-4">
      {filteredMessages.map((message, index) => {
        const isLastAssistantMessage =
          message.message.role === OpenAIMessageRole.ASSISTANT &&
          index === lastAssistantIndex;

        return (
          <div key={message.id}>
            {renderMessage(
              message,
              messages,
              citations,
              conversation,
              messageOperator,
              onRegenerate,
              onEdit,
              isLastAssistantMessage,
              regeneratingParentId
            )}
            {message.status === MessageStatus.FAILED &&
              message.attrs?.error_message && (
                <div className="text-destructive mt-2">
                  {message.attrs.error_message}
                </div>
              )}
            {index < filteredMessages.length - 1 &&
              ![OpenAIMessageRole.TOOL, OpenAIMessageRole.USER].includes(
                message.message.role
              ) && <div className="py-4" />}
          </div>
        );
      })}
    </div>
  );
}
