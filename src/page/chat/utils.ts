import type { i18n as I18nType } from 'i18next';

import { getLangOnly } from '@/lib/lang';
import {
  ConversationDetail,
  ConversationSummary,
} from '@/page/chat/types/conversation';

import { ToolType } from './chat-input/types';

interface GroupedItems {
  [key: string]: Array<ConversationSummary>;
}

export interface MessageNode {
  attrs: {
    enable_thinking: boolean;
    lang: string;
    tools: ToolType[];
  };
  id: string;
  children: string[];
  message: {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string;
  };
  parent_id: string | null;
}

function convert(year: number, month: number, i18n: I18nType): string {
  if (getLangOnly(i18n) === 'zh') {
    return `${year} 年 ${month} 月`;
  }
  const date = new Date(year, month - 1);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
  }).format(date);
}

export function groupItemsByTimestamp(
  items: Array<ConversationSummary>,
  i18n: I18nType
): [string, Array<ConversationSummary>][] {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const grouped: GroupedItems = {};
  const monthGroups: { key: string; date: Date }[] = [];

  items.forEach(item => {
    const itemDate = new Date(item.created_at || 0);
    const itemYear = itemDate.getFullYear();
    const itemMonth = itemDate.getMonth() + 1;

    if (itemDate >= today) {
      if (!grouped[i18n.t('date.today')]) {
        grouped[i18n.t('date.today')] = [];
      }
      grouped[i18n.t('date.today')].push(item);
    } else if (itemDate >= yesterday && itemDate < today) {
      if (!grouped[i18n.t('date.yesterday')]) {
        grouped[i18n.t('date.yesterday')] = [];
      }
      grouped[i18n.t('date.yesterday')].push(item);
    } else if (itemDate >= sevenDaysAgo && itemDate < yesterday) {
      if (!grouped[i18n.t('date.last_week')]) {
        grouped[i18n.t('date.last_week')] = [];
      }
      grouped[i18n.t('date.last_week')].push(item);
    } else {
      const monthKey = convert(itemYear, itemMonth, i18n);
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
        monthGroups.push({
          key: monthKey,
          date: new Date(itemYear, itemMonth - 1, 1),
        });
      }
      grouped[monthKey].push(item);
    }
  });

  monthGroups.sort((a, b) => b.date.getTime() - a.date.getTime());

  const orderedGroups: [string, Array<ConversationSummary>][] = [];

  if (grouped[i18n.t('date.today')]) {
    orderedGroups.push([i18n.t('date.today'), grouped[i18n.t('date.today')]]);
  }
  if (grouped[i18n.t('date.yesterday')]) {
    orderedGroups.push([
      i18n.t('date.yesterday'),
      grouped[i18n.t('date.yesterday')],
    ]);
  }
  if (grouped[i18n.t('date.last_week')]) {
    orderedGroups.push([
      i18n.t('date.last_week'),
      grouped[i18n.t('date.last_week')],
    ]);
  }

  monthGroups.forEach(month => {
    orderedGroups.push([month.key, grouped[month.key]]);
  });

  return orderedGroups;
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export function getTitleFromConversationDetail(
  conversation: ConversationDetail
) {
  if (conversation.title) {
    return conversation.title;
  }

  const mappingValues = Object.values(conversation.mapping || {});

  for (const messageItem of mappingValues) {
    if (
      messageItem?.message?.role === 'user' &&
      messageItem?.message?.content &&
      messageItem.message.content.trim() !== ''
    ) {
      return messageItem.message.content;
    }
  }

  return;
}

/**
 * 根据节点ID向上查找最近的用户角色父节点
 * @param nodes 所有节点的数组
 * @param targetId 目标节点ID
 * @returns 找到的用户角色节点，若未找到则返回null
 */
export function findNearestUserParent(
  nodes: MessageNode[],
  targetId: string
): MessageNode | null {
  // 创建ID到节点的映射，提高查找效率
  const nodeMap = new Map<string, MessageNode>();
  nodes.forEach(node => nodeMap.set(node.id, node));

  let currentId: string | null = targetId;

  while (currentId) {
    const currentNode = nodeMap.get(currentId);
    if (!currentNode) break; // 节点不存在，终止查找

    // 获取父节点ID
    const parentId = currentNode.parent_id;
    if (!parentId) break; // 已到根节点，无父节点

    const parentNode = nodeMap.get(parentId);
    if (!parentNode) break; // 父节点不存在，终止查找

    // 检查父节点是否为用户角色
    if (parentNode.message.role === 'user') {
      return parentNode;
    }

    // 继续向上追溯
    currentId = parentId;
  }

  // 未找到符合条件的父节点
  return null;
}
