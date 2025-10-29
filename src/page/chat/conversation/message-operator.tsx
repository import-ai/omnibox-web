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
  // 用于跟踪 retry 场景：记录应该被跳过的 user 消息 ID，以及它应该映射到的真实 parent ID
  let retryUserMessageId: string | null = null;
  let actualParentId: string | null = null;

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
      // 如果这是 assistant 消息，且其 parent 是被标记为 retry 的 user 消息
      // 则重定向到真实的 parent
      let parentId = chatResponse.parentId;
      let isRetryAssistant = false;
      if (
        chatResponse.role === 'assistant' &&
        retryUserMessageId &&
        parentId === retryUserMessageId
      ) {
        console.log('Retry: Redirecting assistant message', {
          originalParent: parentId,
          newParent: actualParentId,
        });
        parentId = actualParentId || undefined;
        isRetryAssistant = true; // 标记这是 retry 产生的 assistant 消息
        retryUserMessageId = null;
        actualParentId = null;
      }

      const message: MessageDetail = {
        id: chatResponse.id,
        message: {
          role: chatResponse.role,
        },
        status: MessageStatus.PENDING,
        parent_id: parentId,
        children: [],
      };

      // 检测 retry 场景：user 消息的 parent 是另一个 user 消息
      if (chatResponse.role === 'user' && parentId) {
        setConversation(prev => {
          const parentMessage = prev.mapping[parentId];
          // 如果 parent 是 user 消息，说明这是 retry
          if (parentMessage?.message.role === 'user') {
            retryUserMessageId = chatResponse.id;
            actualParentId = parentId;
            return prev; // 不添加这个 user 消息
          }
          return prev;
        });

        // 如果检测到是 retry，直接返回，不添加这个 user 消息
        if (retryUserMessageId === chatResponse.id) {
          return chatResponse.id;
        }
      }

      setConversation(prev => {
        let currentNode = prev.current_node;

        // 如果新消息的 parent_id 等于当前节点，自动追加
        if (message.parent_id === currentNode) {
          currentNode = message.id;
        }
        // 如果是 retry 产生的 assistant 消息，自动激活它
        else if (isRetryAssistant) {
          currentNode = message.id;
        }
        // 如果是用户消息，说明可能是新的分支，自动激活到这个分支
        else if (chatResponse.role === 'user') {
          currentNode = message.id;
        }

        // 更新 parent 的 children 数组
        if (message.parent_id) {
          const parentMessage = prev.mapping[message.parent_id];
          if (parentMessage) {
            if (!parentMessage.children.includes(message.id)) {
              // 创建新的 parent 对象，确保 React 检测到变化
              const updatedParent = {
                ...parentMessage,
                children: [...parentMessage.children, message.id],
              };
              console.log('Adding message to parent children:', {
                messageId: message.id,
                messageRole: message.message.role,
                parentId: message.parent_id,
                oldChildren: parentMessage.children,
                newChildren: updatedParent.children,
                isRetryAssistant,
              });
              const newMapping = {
                ...prev.mapping,
                [message.parent_id]: updatedParent,
                [message.id]: message,
              };
              return {
                ...prev,
                mapping: newMapping,
                current_node: currentNode,
              };
            }
          } else {
            console.error(
              `Parent message with ID ${message.parent_id} not found for message ${message.id}`
            );
          }
        }

        // 如果没有 parent 或 children 已经包含，只添加新消息
        const newMapping = { ...prev.mapping, [message.id]: message };
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
     * 激活指定的消息分支，并追溯到该分支的最后一个节点
     * @param id - 要激活的消息ID（通常是用户消息或助手消息）
     */
    activate: (id: string) => {
      setConversation(prev => {
        let currentNode = id;
        let children: string[] = prev.mapping[currentNode]?.children || [];

        // 追溯到最后一个子节点
        while (children.length > 0) {
          // 选择最后一个子节点（最新的分支）
          currentNode = children[children.length - 1];
          children = prev.mapping[currentNode]?.children || [];
        }

        return {
          ...prev,
          mapping: { ...prev.mapping },
          current_node: currentNode,
        };
      });
    },
  };
}
