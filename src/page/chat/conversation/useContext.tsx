import { isFunction } from 'lodash-es';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import { getWizardLang } from '@/lib/wizard-lang';
import {
  type ChatActionType,
  ChatMode,
  ToolType,
} from '@/page/chat/chat-input/types';
import {
  createMessageOperator,
  MessageOperator,
} from '@/page/chat/conversation/message-operator';
import { ask } from '@/page/chat/conversation/utils';
import {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/types/conversation';
import useGlobalContext from '@/page/chat/useContext';

import { getTitleFromConversationDetail } from '../utils';
import {
  BranchSelections,
  getBranchSelections,
  saveBranchSelections,
} from './current-node-storage';

export default function useContext() {
  const app = useApp();
  const params = useParams();
  const { i18n } = useTranslation();
  const [value, onChange] = useState<string>('');
  const askAbortRef = useRef<() => void>(null);
  const namespaceId = params.namespace_id || '';
  const conversationId = params.conversation_id || '';
  const sessionState = sessionStorage.getItem('state');
  const state = sessionState ? JSON.parse(sessionState) : {};
  const routeQuery: string | undefined = state?.value;
  const [tools, onToolsChange] = useState<Array<ToolType>>(state?.tools || []);
  const [loading, setLoading] = useState<boolean>(
    routeQuery !== undefined && routeQuery.trim().length > 0
  );
  const [mode, setMode] = useState<ChatMode>(state?.mode || ChatMode.ASK);
  const { context, onContextChange } = useGlobalContext();
  const [conversation, setConversation] = useState<ConversationDetail>({
    id: conversationId,
    mapping: {},
  });

  // 分支选择状态：记录每个用户消息选择了哪个assistant回复
  const [branchSelections, setBranchSelections] = useState<BranchSelections>(
    () => getBranchSelections(conversationId)
  );

  const refetch = () => {
    return http
      .get(`/namespaces/${namespaceId}/conversations/${conversationId}`)
      .then(response => {
        const conversationTitle = getTitleFromConversationDetail(response);
        if (conversationTitle) {
          app.fire('chat:title:update', conversationTitle);
        }
        setConversation(response);
      });
  };
  const messages = useMemo((): MessageDetail[] => {
    // 从根节点开始构建消息路径，支持用户消息和助手消息的分支选择
    const result: MessageDetail[] = [];

    // 如果 mapping 不存在，返回空数组
    if (!conversation?.mapping) return [];

    // 打印对话树结构（用于调试）
    const nodesWithMultipleChildren = Object.values(
      conversation.mapping
    ).filter(node => node.children.length > 1);
    if (nodesWithMultipleChildren.length > 0) {
    }

    // 找到根节点（没有 parent_id 的节点）
    const rootNodes = Object.values(conversation.mapping).filter(
      msg => !msg.parent_id
    );

    if (rootNodes.length === 0) return [];

    // 从根节点开始递归构建路径
    let currentNode = rootNodes[0];

    while (currentNode) {
      // 跳过 system 消息
      if (currentNode.message.role !== 'system') {
        result.push(currentNode);
      }

      // 查找下一个节点
      if (currentNode.children.length === 0) {
        break;
      }

      // 检查是否有分支选择
      const selectedChildId = branchSelections[currentNode.id];

      let nextNode: MessageDetail | undefined;

      if (selectedChildId) {
        // 如果有选择，使用选中的分支
        nextNode = conversation.mapping[selectedChildId];
      } else {
        // 否则使用最后一个子节点（最新的版本，例如重新编辑后的最新版本）
        const lastChildId =
          currentNode.children[currentNode.children.length - 1];
        nextNode = conversation.mapping[lastChildId];
      }

      // 检测并跳过 retry 产生的重复 user 消息
      if (nextNode) {
        const isRetryDuplicateUser =
          nextNode.message.role === 'user' &&
          currentNode.message.role === 'user';

        if (isRetryDuplicateUser && nextNode.children.length > 0) {
          // 跳过重复的 user 消息，直接到其子节点
          nextNode = conversation.mapping[nextNode.children[0]];
        }
      }

      currentNode = nextNode;
    }

    return result;
  }, [conversation, branchSelections]);
  const messageOperator = useMemo((): MessageOperator => {
    return createMessageOperator(setConversation);
  }, [setConversation]);

  // 处理分支导航 - assistant 消息
  const onBranchNavigate = useCallback(
    (userMessageId: string, assistantMessageId: string) => {
      const newSelections = {
        ...branchSelections,
        [userMessageId]: assistantMessageId,
      };
      setBranchSelections(newSelections);
      saveBranchSelections(conversationId, newSelections);
    },
    [branchSelections, conversationId]
  );

  // 处理分支导航 - user 消息（重新编辑产生的多个版本）
  const onUserBranchNavigate = useCallback(
    (parentMessageId: string, userMessageId: string) => {
      const newSelections = {
        ...branchSelections,
        [parentMessageId]: userMessageId,
      };
      setBranchSelections(newSelections);
      saveBranchSelections(conversationId, newSelections);
    },
    [branchSelections, conversationId]
  );

  const onAction = async (
    action?: ChatActionType,
    reValue?: string,
    parentMessageId?: string
  ) => {
    if (action === 'stop') {
      isFunction(askAbortRef.current) && askAbortRef.current();
      setLoading(false);
      return;
    } else {
      const v = reValue ? reValue.trim() : value.trim();
      if (v) {
        onChange('');

        // 如果是重新编辑（有 reValue 但没有有效的 parentMessageId）
        // 需要智能查找父节点，确保新消息成为最后一条用户消息的兄弟节点
        let effectiveParentId = parentMessageId;
        if (reValue && !parentMessageId && messages.length > 0) {
          // 找到最后一条用户消息
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].message.role === 'user') {
              effectiveParentId = messages[i].parent_id;
              break;
            }
          }
        }

        // 如果是重新编辑（有 effectiveParentId），清除该父节点的分支选择
        // 这样系统会自动选择最新的版本
        if (effectiveParentId) {
          const newSelections = { ...branchSelections };
          delete newSelections[effectiveParentId];
          setBranchSelections(newSelections);
          saveBranchSelections(conversationId, newSelections);
        }

        await submit(v, effectiveParentId);
      }
    }
  };
  const submit = async (query?: string, parentMessageId?: string) => {
    if (!query || query.trim().length === 0) {
      return;
    }
    setLoading(true);
    try {
      const askFN = ask(
        conversationId,
        query,
        tools,
        context,
        messages,
        messageOperator,
        `/api/v1/namespaces/${namespaceId}/wizard/${mode}`,
        getWizardLang(i18n),
        namespaceId,
        undefined,
        undefined,
        parentMessageId
      );
      askAbortRef.current = askFN.destroy;
      await askFN.start();

      // 重新编辑完成后，重新获取对话数据以确保数据同步
      if (parentMessageId) {
        await refetch();
        // useEffect 会自动为新分支选择最新版本，无需手动干预
      }
    } finally {
      setLoading(false);
    }
  };

  // 初始化：为所有有多个分支的节点自动选择最新版本
  useEffect(() => {
    if (
      !conversation?.mapping ||
      Object.keys(conversation.mapping).length === 0
    ) {
      return;
    }

    const currentSelections = getBranchSelections(conversationId);
    const newSelections = { ...currentSelections };
    let hasUpdates = false;

    // 遍历所有节点，找到有多个子节点的情况
    Object.values(conversation.mapping).forEach(node => {
      if (node.children && node.children.length > 1) {
        // 如果这个节点还没有分支选择记录，自动选择最后一个（最新的）
        if (!newSelections[node.id]) {
          const lastChildId = node.children[node.children.length - 1];
          newSelections[node.id] = lastChildId;
          hasUpdates = true;
        }
      }
    });

    // 如果有更新，保存到状态和 localStorage
    if (hasUpdates) {
      setBranchSelections(newSelections);
      saveBranchSelections(conversationId, newSelections);
    }
  }, [conversation?.mapping, conversationId]);

  useEffect(() => {
    if (!state.conversation) {
      refetch();
      return;
    }
    const conversationTitle = getTitleFromConversationDetail(
      state.conversation
    );
    if (conversationTitle) {
      app.fire('chat:title:update', conversationTitle);
    }

    setConversation(state.conversation);
    sessionStorage.removeItem('state');
    submit(routeQuery);
  }, []);

  return {
    mode,
    value,
    tools,
    setMode,
    loading,
    context,
    onChange,
    onAction,
    messages,
    onToolsChange,
    onContextChange,
    namespaceId,
    conversation,
    onBranchNavigate,
    onUserBranchNavigate,
  };
}
