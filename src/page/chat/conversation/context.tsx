import { http } from '@/lib/request';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/types/conversation';
import useGlobalContext, { IResTypeContext } from '@/page/chat/useContext';
import { ToolType } from '@/page/chat/chat-input/types';
import {
  ChatBOSResponse,
  ChatDeltaResponse,
  MessageStatus,
} from '@/page/chat/types/chat-response.tsx';

interface IProps {
  value: string;
  context: IResTypeContext[];
  tools: ToolType[];
  namespaceId: string;
  conversationId: string;
}

export default function useContext() {
  const params = useParams();

  const loc = useLocation();
  const state: IProps = loc.state;
  const namespaceId = state?.namespaceId || params.namespace_id || '';
  const conversationId = state?.conversationId || params.conversation_id || '';
  const routeQuery: string | undefined = state?.value;
  const [tools, onToolsChange] = useState<Array<ToolType>>(state?.tools || []);
  const { context, onContextChange } = useGlobalContext({
    data: state?.context || [],
  });

  const [conversation, setConversation] = useState<ConversationDetail>({
    id: conversationId,
    mapping: {},
  });
  const refetch = () => {
    http
      .get(`/namespaces/${namespaceId}/conversations/${conversationId}`)
      .then(setConversation);
  };

  const messages = useMemo((): MessageDetail[] => {
    const result: MessageDetail[] = [];
    let currentNode: string | undefined = conversation.current_node;
    while (currentNode) {
      const message: MessageDetail = conversation.mapping[currentNode];
      result.unshift(message);
      currentNode = message.parentId;
    }
    return result;
  }, [conversation]);

  const add = (source?: string, delta?: string): string | undefined => {
    return delta ? (source || '') + delta : source;
  };

  const updateMessage = (delta: ChatDeltaResponse, id?: string) => {
    setConversation((prev) => {
      if (!id) {
        id = prev.current_node!;
      }
      const message = prev.mapping[id];

      message.message.content = add(
        message.message.content,
        delta.message.content,
      );

      message.message.reasoning_content = add(
        message.message.reasoning_content,
        delta.message.reasoning_content,
      );

      if (delta.message.tool_calls && delta.message.tool_calls.length > 0) {
        message.message.tool_calls = delta.message.tool_calls;
      }

      if (delta.message.tool_call_id) {
        message.message.tool_call_id = delta.message.tool_call_id;
      }

      message.status = MessageStatus.STREAMING;
      if (delta.attrs && delta.attrs.citations) {
        message.attrs = {
          ...(message.attrs || {}),
          citations: delta.attrs.citations,
        };
      }

      const newMapping = { ...prev.mapping, [id]: message };
      return {
        ...prev,
        mapping: newMapping,
      };
    });
  };

  const addMessage = (chatResponse: ChatBOSResponse): string => {
    const message: MessageDetail = {
      id: chatResponse.id,
      message: {
        role: chatResponse.role,
      },
      status: MessageStatus.PENDING,
      parentId: chatResponse.parentId,
      children: [],
    };

    setConversation((prev) => {
      const newMapping = { ...prev.mapping, [message.id]: message };
      let currentNode = prev.current_node;
      if (message.parentId === currentNode) {
        currentNode = message.id;
      }
      if (message.parentId) {
        const parentMessage = prev.mapping[message.parentId];
        if (parentMessage) {
          if (!parentMessage.children.includes(message.id)) {
            parentMessage.children.push(message.id);
          }
        } else {
          console.error(
            `Parent message with ID ${message.parentId} not found for message ${message.id}`,
          );
        }
      }
      return {
        ...prev,
        mapping: newMapping,
        current_node: currentNode,
      };
    });
    return chatResponse.id;
  };

  const messageDone = (id?: string) => {
    setConversation((prev) => {
      if (!id) {
        id = prev.current_node!;
      }
      const message = prev.mapping[id];
      if (message) {
        message.status = MessageStatus.SUCCESS;
        return {
          ...prev,
          mapping: { ...prev.mapping, [id]: message },
        };
      }
      return prev;
    });
  };

  useEffect(refetch, [namespaceId, conversationId]);

  return {
    routeQuery,
    conversation,
    setConversation,
    addMessage,
    updateMessage,
    messageDone,
    messages,
    namespaceId,
    conversationId,
    tools,
    onToolsChange,
    context,
    onContextChange,
  };
}
