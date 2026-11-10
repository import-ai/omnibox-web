import { Dispatch, SetStateAction } from 'react';

import { hasToolCalls } from '../conversation/conversationHistory';
import { mergeAnswerTimingAttrs, readAnswerTiming } from './answerTiming';
import { createClientKey } from './clientKey';
import {
  ChatBOSResponse,
  ChatDeltaResponse,
  ChatErrorResponse,
  MessageStatus,
  OpenAIMessageRole,
} from './types/chatResponse.ts';
import { ConversationDetail, MessageDetail } from './types/conversation.ts';

function add(source?: string, delta?: string): string | undefined {
  return delta ? (source || '') + delta : source;
}

export interface MessageOperator {
  isUserMessage?: (id?: string) => boolean;
  update: (delta: ChatDeltaResponse, id?: string) => void;
  add: (chatResponse: ChatBOSResponse) => string;
  done: (id?: string) => void;
  stop: (id?: string) => void;
  error: (errorResponse: ChatErrorResponse, id?: string) => void;
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
        !hasToolCalls(currentNode)
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

function getMessage(
  conversation: ConversationDetail,
  id?: string
): MessageDetail | undefined {
  id = id || conversation.current_node;
  if (!id || !(id in conversation.mapping)) {
    return undefined;
  }
  return conversation.mapping[id];
}

export function createMessageOperator(
  conversation: ConversationDetail,
  setConversation: Dispatch<SetStateAction<ConversationDetail>>
): MessageOperator {
  return {
    isUserMessage: id =>
      !!id && conversation.mapping[id]?.message.role === OpenAIMessageRole.USER,
    update: (delta: ChatDeltaResponse, id?: string) => {
      setConversation(prev => {
        const message = getMessage(prev, id);
        if (!message) return prev;
        if (message.status === MessageStatus.STOPPED) {
          if (!delta.attrs?.answer_timing) return prev;
          return {
            ...prev,
            mapping: {
              ...prev.mapping,
              [message.id]: {
                ...message,
                localRevision: (message.localRevision ?? 0) + 1,
                attrs: mergeAnswerTimingAttrs(message.attrs, {
                  answer_timing: delta.attrs.answer_timing,
                }),
              },
            },
          };
        }

        if (
          message.message.role === OpenAIMessageRole.USER &&
          message.attrs?.pending_query &&
          delta.message.content
        ) {
          message.message.content = delta.message.content;
          if (message.attrs.client_request_id !== message.id) {
            message.attrs = { ...message.attrs, pending_query: false };
          }
        } else {
          message.message.content = add(
            message.message.content,
            delta.message.content
          );
        }

        message.localRevision = (message.localRevision ?? 0) + 1;
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

        if (
          ![
            MessageStatus.SUCCESS,
            MessageStatus.STOPPED,
            MessageStatus.FAILED,
          ].includes(message.status)
        ) {
          message.status = MessageStatus.STREAMING;
        }
        if (delta.attrs) {
          message.attrs = mergeAnswerTimingAttrs(message.attrs, delta.attrs);
        }

        const newMapping = { ...prev.mapping, [message.id]: message };
        return {
          ...prev,
          mapping: newMapping,
        };
      });
    },

    add: (chatResponse: ChatBOSResponse): string => {
      setConversation(prev => {
        const pendingId = chatResponse.attrs?.client_request_id;
        const pending = pendingId ? prev.mapping[pendingId] : undefined;
        const existing = pending || prev.mapping[chatResponse.id];
        const existingTiming = readAnswerTiming(existing?.attrs?.answer_timing);
        const preserveStatus =
          existingTiming && existingTiming.status !== 'running';
        const message: MessageDetail = {
          id: chatResponse.id,
          localRevision: (existing?.localRevision ?? 0) + 1,
          details_loaded: true,
          clientKey: existing?.clientKey ?? createClientKey(),
          created_at:
            chatResponse.created_at ||
            existing?.created_at ||
            new Date().toISOString(),
          message: {
            ...(existing?.message || {}),
            role: chatResponse.role,
          },
          status:
            preserveStatus && existing
              ? existing.status
              : MessageStatus.PENDING,
          parent_id: chatResponse.parentId,
          children: existing?.children || [],
          attrs: mergeAnswerTimingAttrs(existing?.attrs, chatResponse.attrs),
        };
        if (!preserveStatus) {
          delete message.attrs?.error_message;
          delete message.attrs?.error_code;
          delete message.attrs?.error_status;
        }
        const newMapping = { ...prev.mapping, [message.id]: message };
        if (pendingId && pendingId !== message.id) {
          delete newMapping[pendingId];
          for (const parent of Object.values(newMapping)) {
            if (parent.children.includes(pendingId)) {
              newMapping[parent.id] = {
                ...parent,
                children: parent.children.map(id =>
                  id === pendingId ? message.id : id
                ),
              };
            }
          }
        }
        if (message.parent_id) {
          const parent = newMapping[message.parent_id];
          if (parent && !parent.children.includes(message.id)) {
            newMapping[message.parent_id] = {
              ...parent,
              children: [...parent.children, message.id],
            };
          }
        }
        return { ...prev, mapping: newMapping, current_node: message.id };
      });
      return chatResponse.id;
    },
    done: (id?: string) => {
      setConversation(prev => {
        const message = getMessage(prev, id);
        if (
          !message ||
          message.status === MessageStatus.STOPPED ||
          (message.status === MessageStatus.FAILED &&
            readAnswerTiming(message.attrs?.answer_timing)?.status === 'failed')
        ) {
          return prev;
        }
        message.localRevision = (message.localRevision ?? 0) + 1;
        message.status = MessageStatus.SUCCESS;
        delete message.attrs?.error_message;
        delete message.attrs?.error_code;
        delete message.attrs?.error_status;
        if (message.message.role === OpenAIMessageRole.TOOL) {
          message.attrs = {
            ...(message.attrs || {}),
            tool_call: {
              ...(message.attrs?.tool_call || {}),
              in_streaming: true,
              status: message.attrs?.tool_call?.status || 'success',
            },
          };
        }
        return {
          ...prev,
          mapping: { ...prev.mapping, [message.id]: message },
        };
      });
    },

    stop: (id?: string) => {
      setConversation(prev => {
        let message = getMessage(prev, id);
        if (!message) return prev;
        const targetId = message.id;
        let current = getMessage(prev);
        const descendants = new Set<string>();
        while (current && !descendants.has(current.id)) {
          descendants.add(current.id);
          if (current.id === targetId) {
            message = getMessage(prev) ?? message;
            break;
          }
          if (
            current.message.role === OpenAIMessageRole.USER &&
            !current.attrs?.tool_call?.decisions?.length
          )
            break;
          current = prev.mapping[current.parent_id];
        }
        if (!message) return prev;
        const runId = message.attrs?.turn_run_id;
        const mapping = { ...prev.mapping };
        const seen = new Set<string>();
        while (message && !seen.has(message.id)) {
          seen.add(message.id);
          const isQuery =
            message.message.role === OpenAIMessageRole.USER &&
            !message.attrs?.tool_call?.decisions?.length;
          const terminal = [
            MessageStatus.SUCCESS,
            MessageStatus.FAILED,
            MessageStatus.STOPPED,
          ].includes(message.status);
          mapping[message.id] = {
            ...message,
            localRevision: (message.localRevision ?? 0) + 1,
            status:
              terminal || isQuery ? message.status : MessageStatus.STOPPED,
            attrs: {
              ...message.attrs,
              ...(!isQuery
                ? {
                    turn_status: 'stopped' as const,
                    ...(runId ? { stopped_run_id: runId } : {}),
                  }
                : {}),
            },
          };
          if (mapping[message.id].status === MessageStatus.STOPPED) {
            delete mapping[message.id].attrs?.error_message;
            delete mapping[message.id].attrs?.error_code;
            delete mapping[message.id].attrs?.error_status;
          }
          if (isQuery) break;
          message = mapping[message.parent_id];
        }
        return { ...prev, mapping };
      });
    },

    error: (errorResponse: ChatErrorResponse, id?: string) => {
      setConversation(prev => {
        const message = getMessage(prev, id);
        if (!message) {
          return prev;
        }
        message.localRevision = (message.localRevision ?? 0) + 1;
        message.status = MessageStatus.FAILED;
        message.attrs = {
          ...(message.attrs || {}),
          error_message:
            typeof errorResponse.message === 'string' &&
            errorResponse.message.trim()
              ? errorResponse.message
              : 'Unknown error',
          error_code: errorResponse.code,
          error_status: errorResponse.status,
        };
        return {
          ...prev,
          mapping: { ...prev.mapping, [message.id]: message },
        };
      });
    },

    /**
     * Get siblings of a message.
     * @param id
     */
    getSiblings: (id: string): string[] => {
      const currentNode = conversation.mapping[id];
      if (currentNode?.sibling_ids) return currentNode.sibling_ids;
      if (currentNode && hasToolCalls(currentNode)) {
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
          if (!parentNode) return [];
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
        while (
          !targetRoles.includes(currentNode.message.role) ||
          (currentNode.attrs?.tool_call?.decisions ?? []).length > 0
        ) {
          currentNode = conversation.mapping[currentNode.parent_id];
          if (!currentNode) return '';
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
