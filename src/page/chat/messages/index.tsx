import React from 'react';
import type { MessageDetail } from '@/page/chat/types/conversation';
import {
  type Citation,
  OpenAIMessageRole,
} from '@/page/chat/types/chat-response';
import { AssistantMessage } from '@/page/chat/messages/role/assistant-message';
import { UserMessage } from '@/page/chat/messages/role/user-message';
import { ToolMessage } from '@/page/chat/messages/role/tool-message';

interface IProps {
  messages: MessageDetail[];
}

export function Messages(props: IProps) {
  const { messages } = props;
  const citations = React.useMemo((): Citation[] => {
    const result: Citation[] = [];
    for (const message of messages) {
      if (message.attrs?.citations && message.attrs.citations.length > 0) {
        result.push(...message.attrs.citations);
      }
    }
    return result;
  }, [messages]);

  function renderMessage(message: MessageDetail) {
    const openAIMessage = message.message;

    if (openAIMessage.role === OpenAIMessageRole.USER) {
      return <UserMessage message={message} />;
    } else if (openAIMessage.role === OpenAIMessageRole.ASSISTANT) {
      return <AssistantMessage message={message} citations={citations} />;
    } else if (openAIMessage.role === OpenAIMessageRole.TOOL) {
      return <ToolMessage message={message} />;
    }
  }

  return (
    <>
      <div className="space-y-4">
        {messages.map((message) => (
          <React.Fragment key={message.id!}>
            {renderMessage(message)}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}
