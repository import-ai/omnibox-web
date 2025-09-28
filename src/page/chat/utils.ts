import type { i18n as I18nType } from 'i18next';

import { getLangOnly } from '@/lib/lang';
import { ConversationSummary } from '@/page/chat/types/conversation';

interface GroupedItems {
  [key: string]: Array<ConversationSummary>;
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

export const stream = (
  url: string,
  body: Record<string, any>,
  callback: (data: string) => Promise<void>
) => {
  let isAborted = false;

  return {
    start: async () => {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch from wizard');
      }
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      const decoder = new TextDecoder();
      let buffer: string = '';

      try {
        while (!isAborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          while (!isAborted) {
            const lineEnd = buffer.indexOf('\n');
            if (lineEnd == -1) break;

            const line = buffer.slice(0, lineEnd).trim();
            buffer = buffer.slice(lineEnd + 1);

            if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              await callback(data);
            }
          }
        }
      } finally {
        await reader.cancel();
      }
    },
    destory: () => {
      isAborted = true;
    },
  };
};

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}
