import { Dispatch, SetStateAction } from 'react';

import {
  ChatBOSResponse,
  ChatDeltaResponse,
  MessageStatus,
  OpenAIMessageRole,
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
  getSiblings: (id: string) => string[];
  getParent: (id: string) => string;
}

function getChildren(
  conversation: ConversationDetail,
  id: string,
  targetRole: OpenAIMessageRole
): string[] {
  if (targetRole === OpenAIMessageRole.ASSISTANT) {
    const currentNode = conversation.mapping[id];
    if (currentNode) {
      if (
        currentNode.message.role === OpenAIMessageRole.ASSISTANT &&
        !currentNode.message.tool_calls
      ) {
        return [id];
      }
      const targetChildren: string[] = [];
      for (const childId of currentNode.children || []) {
        targetChildren.push(...getChildren(conversation, childId, targetRole));
      }
      return targetChildren;
    }
  } else if (targetRole === OpenAIMessageRole.USER) {
    const currentNode = conversation.mapping[id];
    if (currentNode) {
      return currentNode.children;
    }
    const children: string[] = [];
    for (const node of Object.values(conversation.mapping)) {
      if (node.parent_id === id) {
        children.push(node.id);
      }
    }
    return children;
  }
  return [];
}

export function createMessageOperator(
  conversation: ConversationDetail,
  setConversation: Dispatch<SetStateAction<ConversationDetail>>
): MessageOperator {
  return {
    update: (delta: ChatDeltaResponse, id?: string) => {
      setConversation(prev => {
        if (!id) {
          id = prev.current_node!;
        }
        const message = prev.mapping[id];
        if (!message) {
          return prev;
        }

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

        if (message.parent_id && prev.current_node !== undefined) {
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
          current_node: message.id,
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
     * Get siblings of a message.
     * @param id
     */
    getSiblings: (id: string): string[] => {
      const currentNode = conversation.mapping[id];
      if (currentNode.message.tool_calls) {
        return [id];
      }
      if (currentNode) {
        const currentRole = currentNode.message.role;
        if (currentNode.message.role === OpenAIMessageRole.USER) {
          return getChildren(conversation, currentNode.parent_id, currentRole);
        }
        let parentNode = currentNode;
        while (parentNode.message.role !== OpenAIMessageRole.USER) {
          parentNode = conversation.mapping[parentNode.parent_id];
        }
        return getChildren(conversation, parentNode.id, currentRole);
      }
      return [];
    },

    /**
     * Get non-tool parent of a message.
     * @param id
     */
    getParent: (id: string): string => {
      let currentNode = conversation.mapping[id];
      if (currentNode) {
        const targetRoles =
          currentNode.message.role === OpenAIMessageRole.ASSISTANT
            ? [OpenAIMessageRole.USER]
            : [OpenAIMessageRole.ASSISTANT, OpenAIMessageRole.SYSTEM];
        while (!targetRoles.includes(currentNode.message.role)) {
          currentNode = conversation.mapping[currentNode.parent_id];
        }
        return currentNode.id;
      }
      return '';
    },

    /**
     * When there is multi message, activate one of them.
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
