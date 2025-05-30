import Artifact from './artifacts';
import Messages from './messages';
import { useState } from 'react';
import useContext from '../useContext';
import ChatInput from '@/page/chat/chat-input';
import { useLocation } from 'react-router-dom';
import { stream, parseCitations } from '../utils';
import {
  Message,
  Citation,
  EndOfMessage,
  ErrorResponse,
  ChatDoneResponse,
  TollCallResponse,
  ChatDeltaResponse,
  ChatCitationsResponse,
  ChatThinkDeltaResponse,
} from '../interface';

export default function ChatConversationPage() {
  const loc = useLocation();
  const state = loc.state;
  const namespaceId = state.namespaceId;
  const conversationId = state.conversationId;
  const [value, onChange] = useState(state.value);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tools, onToolsChange] = useState<Array<string>>(state.tools);
  const { context, onContextChange } = useContext({ data: state.context });
  const getLocalMessages = () => {
    const val = value.trim();
    if (val.length <= 0) {
      return [];
    }
    let localMessages: Message[] = [
      ...messages,
      { role: 'user', content: value },
    ];

    setMessages(localMessages);
    onChange('');
    return localMessages;
  };
  const getCondition = () => {
    const parents = context
      .filter((rc) => rc.type === 'parent')
      .map((rc) => rc.resource);
    const resources = context
      .filter((rc) => rc.type === 'resource')
      .map((rc) => rc.resource);
    return {
      parentIds: parents.length > 0 ? parents.map((r) => r.id) : undefined,
      resourceIds:
        resources.length > 0 ? resources.map((r) => r.id) : undefined,
    };
  };
  const handleAction = async () => {
    let parentMessageId: string | undefined = undefined;
    if (messages.length > 0) {
      parentMessageId = messages[messages.length - 1].id;
    }
    let localMessages = getLocalMessages();
    if (!localMessages) {
      return;
    }
    const { parentIds, resourceIds } = getCondition();
    const body = {
      namespace_id: namespaceId,
      conversation_id: conversationId,
      query: localMessages[localMessages.length - 1].content,
      tools: [
        {
          name: 'knowledge_search',
          namespace_id: namespaceId,
          parent_ids: parentIds,
          resource_ids: resourceIds,
        },
        {
          name: 'web_search',
        },
      ],
      parent_message_id: parentMessageId,
      enable_thinking: true,
    };

    let context: {
      create: boolean;
      think: string;
      response: string;
      citations: Citation[];
    } = { create: true, think: '', response: '', citations: [] };

    const updateMessages = () => {
      const think = parseCitations(context.think, context.citations);
      const response = parseCitations(context.response, context.citations);

      let content: string = '';
      for (const line of think.split('\n')) {
        content += '> ' + line + '\n';
      }
      content += '\n';
      content += response;

      localMessages = [
        ...(context.create ? localMessages : localMessages.slice(0, -1)),
        {
          role: 'assistant',
          content,
        },
      ];
      setMessages(localMessages);

      if (context.create) {
        context.create = false;
      }
    };

    await stream('/api/v1/wizard/ask', body, async (data) => {
      let chatResponse:
        | ChatDeltaResponse
        | ChatCitationsResponse
        | ChatDoneResponse
        | TollCallResponse
        | ChatThinkDeltaResponse
        | EndOfMessage
        | ErrorResponse = JSON.parse(data);

      if (chatResponse.response_type === 'delta') {
        context.response += chatResponse.delta;
        updateMessages();
      } else if (chatResponse.response_type === 'think_delta') {
        context.think += chatResponse.delta;
        updateMessages();
      } else if (chatResponse.response_type === 'tool_call') {
        localMessages = [
          ...localMessages,
          {
            role: 'tool',
            content: `Call [\`${chatResponse.tool_call.function.name}\`] with arguments:\n\`${JSON.stringify(chatResponse.tool_call.function.arguments)}\``,
          },
        ];
        setMessages(localMessages);
        context.create = true;
        context.think = '';
        context.response = '';
      } else if (chatResponse.response_type === 'citations') {
        context.citations.push(...chatResponse.citations);
      } else if (chatResponse.response_type === 'error') {
        console.error({ message: chatResponse.message });
      } else if (chatResponse.response_type === 'done') {
      } else if (chatResponse.response_type === 'end_of_message') {
        const lastMessage = localMessages[localMessages.length - 1];
        if (lastMessage.role === chatResponse.role) {
          lastMessage.id = chatResponse.messageId;
          setMessages(localMessages);
        } else {
          console.error({
            message: 'Message role mismatch',
            lastMessageRole: lastMessage.role,
            targetMessageRole: chatResponse.role,
          });
        }
      } else {
        console.error({ message: 'Unknown response type', chatResponse });
      }
    });
  };

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <Messages />
        <div className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          <ChatInput
            tools={tools}
            value={value}
            context={context}
            onChange={onChange}
            onAction={handleAction}
            onToolsChange={onToolsChange}
            onContextChange={onContextChange}
          />
        </div>
      </div>
      <Artifact />
    </>
  );
}
