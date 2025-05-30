import i18next from 'i18next';
import { Citation, ConversationSummary } from './interface';

interface GroupedItems {
  [key: string]: Array<ConversationSummary>;
}

export function groupItemsByTimestamp(
  items: Array<ConversationSummary>,
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

  items.forEach((item) => {
    const itemDate = new Date(item.created_at || 0);
    const itemYear = itemDate.getFullYear();
    const itemMonth = itemDate.getMonth() + 1;

    if (itemDate >= today) {
      if (!grouped[i18next.t('date.today')]) {
        grouped[i18next.t('date.today')] = [];
      }
      grouped[i18next.t('date.today')].push(item);
    } else if (itemDate >= yesterday && itemDate < today) {
      if (!grouped[i18next.t('date.yesterday')]) {
        grouped[i18next.t('date.yesterday')] = [];
      }
      grouped[i18next.t('date.yesterday')].push(item);
    } else if (itemDate >= sevenDaysAgo && itemDate < yesterday) {
      if (!grouped[i18next.t('date.last_week')]) {
        grouped[i18next.t('date.last_week')] = [];
      }
      grouped[i18next.t('date.last_week')].push(item);
    } else {
      const monthKey = i18next.t('date.month_year', {
        year: itemYear,
        month: itemMonth,
      });
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

  if (grouped[i18next.t('date.today')]) {
    orderedGroups.push([
      i18next.t('date.today'),
      grouped[i18next.t('date.today')],
    ]);
  }
  if (grouped[i18next.t('date.yesterday')]) {
    orderedGroups.push([
      i18next.t('date.yesterday'),
      grouped[i18next.t('date.yesterday')],
    ]);
  }
  if (grouped[i18next.t('date.last_week')]) {
    orderedGroups.push([
      i18next.t('date.last_week'),
      grouped[i18next.t('date.last_week')],
    ]);
  }

  monthGroups.forEach((month) => {
    orderedGroups.push([month.key, grouped[month.key]]);
  });

  return orderedGroups;
}

function cleanCitePrefix(text: string) {
  const citePrefix = '<cite:';
  const citePrefixRegex = /<cite:\d+$/g;
  for (let i = 0; i < citePrefix.length; i++) {
    const suffix = citePrefix.slice(0, i + 1);
    if (text.endsWith(suffix)) {
      return text.replace(suffix, '');
    }
  }
  if (citePrefixRegex.test(text)) {
    return text.replace(citePrefixRegex, '');
  }

  return text;
}

export const parseCitations = (content: string, citations: Citation[]) => {
  content = cleanCitePrefix(content);
  for (let i = 0; i < citations.length; i++) {
    content = content.replace(
      new RegExp(`<cite:${i + 1}>`, 'g'),
      `[[${i + 1}]](${citations[i].link})`,
    );
  }
  return content.trim();
};

export const stream = async (
  url: string,
  body: Record<string, any>,
  callback: (data: string) => Promise<void>,
): Promise<void> => {
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
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      while (true) {
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
};
