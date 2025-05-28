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
      if (!grouped['今天']) {
        grouped['今天'] = [];
      }
      grouped['今天'].push(item);
    }
    // 检查是否是昨天
    else if (itemDate >= yesterday && itemDate < today) {
      if (!grouped['昨天']) {
        grouped['昨天'] = [];
      }
      grouped['昨天'].push(item);
    }
    // 检查是否是过去7天内（不包括今天和昨天）
    else if (itemDate >= sevenDaysAgo && itemDate < yesterday) {
      if (!grouped['过去7天']) {
        grouped['过去7天'] = [];
      }
      grouped['过去7天'].push(item);
    }
    // 按月份分组
    else {
      const monthKey = `${itemYear}年${itemMonth}月`;
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
  if (grouped['今天']) {
    orderedGroups.push(['今天', grouped['今天']]);
  }
  if (grouped['昨天']) {
    orderedGroups.push(['昨天', grouped['昨天']]);
  }
  if (grouped['过去7天']) {
    orderedGroups.push(['过去7天', grouped['过去7天']]);
  }

  // 添加按时间倒序排列的月份分组
  monthGroups.forEach((month) => {
    orderedGroups.push([month.key, grouped[month.key]]);
  });

  return orderedGroups;
}
