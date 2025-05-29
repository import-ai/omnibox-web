import i18next from 'i18next';
import { Conversation } from './interface';

interface GroupedItems {
  [key: string]: Array<Conversation>;
}

export function groupItemsByTimestamp(
  items: Array<Conversation>,
): [string, Array<Conversation>][] {
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

    // 检查是否是今天
    if (itemDate >= today) {
      if (!grouped[i18next.t('date.today')]) {
        grouped[i18next.t('date.today')] = [];
      }
      grouped[i18next.t('date.today')].push(item);
    }
    // 检查是否是昨天
    else if (itemDate >= yesterday && itemDate < today) {
      if (!grouped[i18next.t('date.yesterday')]) {
        grouped[i18next.t('date.yesterday')] = [];
      }
      grouped[i18next.t('date.yesterday')].push(item);
    }
    // 检查是否是过去7天内（不包括今天和昨天）
    else if (itemDate >= sevenDaysAgo && itemDate < yesterday) {
      if (!grouped[i18next.t('date.last_week')]) {
        grouped[i18next.t('date.last_week')] = [];
      }
      grouped[i18next.t('date.last_week')].push(item);
    }
    // 按月份分组
    else {
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

  // 对月份分组进行排序（最近的月份在前）
  monthGroups.sort((a, b) => b.date.getTime() - a.date.getTime());

  // 创建最终的有序分组数组
  const orderedGroups: [string, Array<Conversation>][] = [];

  // 添加固定分组（今天、昨天、过去7天）
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

  // 添加按时间倒序排列的月份分组
  monthGroups.forEach((month) => {
    orderedGroups.push([month.key, grouped[month.key]]);
  });

  return orderedGroups;
}
