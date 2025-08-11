import { Dispatch, SetStateAction } from 'react';

import {
  ChatBOSResponse,
  ChatDeltaResponse,
  MessageStatus,
} from '@/page/chat/types/chat-response';
import {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/types/conversation';

function add(source?: string, delta?: string): string | undefined {
  return delta ? (source || '') + delta : source;
}

export interface MessageOperator {
  update: (delta: ChatDeltaResponse, id?: string) => void;
  add: (chatResponse: ChatBOSResponse) => string;
  done: (id?: string) => void;
  activate: (id: string) => void;
}

export function createMessageOperator(
  setConversation: Dispatch<SetStateAction<ConversationDetail>>
): MessageOperator {
  return {
    update: (delta: ChatDeltaResponse, id?: string) => {
      setConversation(prev => {
        if (!id) {
          id = prev.current_node!;
        }
        const message = prev.mapping[id];

        message.message.content = add(
          message.message.content,
          delta.message.content
        );

        message.message.reasoning_content = add(
          message.message.reasoning_content,
          delta.message.reasoning_content
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
    },

    add: (chatResponse: ChatBOSResponse): string => {
      const message: MessageDetail = {
        id: chatResponse.id,
        message: {
          role: chatResponse.role,
        },
        status: MessageStatus.PENDING,
        parent_id: chatResponse.parentId,
        children: [],
      };

      setConversation(prev => {
        const newMapping = { ...prev.mapping, [message.id]: message };
        let currentNode = prev.current_node;
        if (message.parent_id === currentNode) {
          currentNode = message.id;
        }
        if (message.parent_id) {
          const parentMessage = prev.mapping[message.parent_id];
          if (parentMessage) {
            if (!parentMessage.children.includes(message.id)) {
              parentMessage.children.push(message.id);
            }
          } else {
            console.error(
              `Parent message with ID ${message.parent_id} not found for message ${message.id}`
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
    },

    done: (id?: string) => {
      setConversation(prev => {
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
    },

    /**
     * When there is multi message, activate one of them.
     * Designed for future, now enabled for now.
     * @param id
     */
    activate: (id: string) => {
      setConversation(prev => {
        let currentNode = id;
        let children: string[] = prev.mapping[currentNode].children;
        while (children.length > 0) {
          currentNode = children[children.length - 1];
          children = prev.mapping[currentNode].children;
        }
        return {
          ...prev,
          current_node: currentNode,
        };
      });
    },
  };
}
