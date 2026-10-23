import type { i18n as I18nType } from 'i18next';

import { messagePreviewTitle } from '@/page/chat/conversations/provisionalConversation';
import {
  ConversationDetail,
  ConversationSummary,
} from '@/page/chat/core/types/conversation';

interface GroupedItems {
  [key: string]: Array<ConversationSummary>;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDayLabel(date: Date, i18n: I18nType): string {
  const language = i18n.language || 'en';
  if (language.toLowerCase().startsWith('zh')) {
    return i18n.t('date.calendar_day', {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    });
  }
  return date.toLocaleDateString(language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function groupItemsByTimestamp(
  items: Array<ConversationSummary>,
  i18n: I18nType
): [string, Array<ConversationSummary>][] {
  const today = startOfLocalDay(new Date());

  const grouped: GroupedItems = {};
  const dayGroups: { key: string; date: Date }[] = [];

  const push = (key: string, item: ConversationSummary) => {
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  };

  items.forEach(item => {
    const timestamp = item.updated_at || item.created_at;
    const parsed = timestamp ? new Date(timestamp) : new Date(NaN);
    if (Number.isNaN(parsed.getTime())) {
      push(i18n.t('date.earlier'), item);
      return;
    }

    const itemDay = startOfLocalDay(parsed);
    const dayDiff = Math.round(
      (today.getTime() - itemDay.getTime()) / 86400000
    );
    if (dayDiff <= 0) {
      push(i18n.t('date.today'), item);
    } else if (dayDiff === 1) {
      push(i18n.t('date.yesterday'), item);
    } else if (dayDiff > 1 && dayDiff < 7) {
      push(i18n.t('date.last_week'), item);
    } else {
      const dayKey = formatDayLabel(itemDay, i18n);
      if (!grouped[dayKey]) {
        dayGroups.push({ key: dayKey, date: itemDay });
      }
      push(dayKey, item);
    }
  });

  dayGroups.sort((a, b) => b.date.getTime() - a.date.getTime());

  const orderedGroups: [string, Array<ConversationSummary>][] = [];
  for (const key of ['date.today', 'date.yesterday', 'date.last_week']) {
    const label = i18n.t(key);
    if (grouped[label]) {
      orderedGroups.push([label, grouped[label]]);
    }
  }
  dayGroups.forEach(day => {
    orderedGroups.push([day.key, grouped[day.key]]);
  });
  const earlier = i18n.t('date.earlier');
  if (grouped[earlier]) {
    orderedGroups.push([earlier, grouped[earlier]]);
  }

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
    const content = messageItem?.message?.content;
    if (messageItem?.message?.role !== 'user' || !content?.trim()) {
      continue;
    }
    const preview = messagePreviewTitle(content);
    if (preview) return preview;
  }

  return;
}
