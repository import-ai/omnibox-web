import i18next from 'i18next';
import { Resource } from '@/interface';
import { enUS, zhCN } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';

export function getTime(resource: Resource | null) {
  if (!resource) {
    return '';
  }
  if (resource.updated_at) {
    return (
      i18next.t('updated') +
      ' ' +
      formatDistanceToNow(new Date(resource.updated_at), {
        addSuffix: true,
        locale: i18next.language === 'zh' ? zhCN : enUS,
      })
    );
  }
  if (resource.created_at) {
    return (
      i18next.t('created') +
      ' ' +
      formatDistanceToNow(new Date(resource.created_at), {
        addSuffix: true,
        locale: i18next.language === 'zh' ? zhCN : enUS,
      })
    );
  }
  return '';
}

interface GroupedItems {
  [key: string]: Array<Resource>;
}

function convert(year: number, month: number): string {
  if (i18next.language === 'zh') {
    return `${year} 年 ${month} 月`;
  }
  const date = new Date(year, month - 1);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
  }).format(date);
}

export function groupItemsByTimestamp(
  items: Array<Resource>,
): [string, Array<Resource>][] {
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
    const itemDate = new Date(item.updated_at || 0);
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
      const monthKey = convert(itemYear, itemMonth);
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

  const orderedGroups: [string, Array<Resource>][] = [];

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
