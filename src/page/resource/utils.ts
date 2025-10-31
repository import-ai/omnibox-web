import { formatDistanceToNow } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import type { i18n as I18nType } from 'i18next';

import { Resource, ResourceMeta, SharedResource } from '@/interface';
import { getLangOnly } from '@/lib/lang';

export function getTime(resource: Resource | null, i18next: I18nType) {
  if (!resource) {
    return '';
  }
  if (resource.updated_at) {
    return i18next.t('updated', {
      related_updated_at: formatDistanceToNow(new Date(resource.updated_at), {
        addSuffix: true,
        locale: getLangOnly(i18next) === 'zh' ? zhCN : enUS,
      }),
    });
  }
  if (resource.created_at) {
    return (
      i18next.t('created') +
      ' ' +
      formatDistanceToNow(new Date(resource.created_at), {
        addSuffix: true,
        locale: getLangOnly(i18next) === 'zh' ? zhCN : enUS,
      })
    );
  }
  return '';
}

interface GroupedItems {
  [key: string]: Array<ResourceMeta>;
}

function convert(year: number, month: number, i18next: I18nType): string {
  if (getLangOnly(i18next) === 'zh') {
    return `${year} 年 ${month} 月`;
  }
  const date = new Date(year, month - 1);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
  }).format(date);
}

export function groupItemsByTimestamp(
  items: Array<ResourceMeta>,
  i18next: I18nType
): [string, Array<ResourceMeta>][] {
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
      const monthKey = convert(itemYear, itemMonth, i18next);
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

  const orderedGroups: [string, Array<ResourceMeta>][] = [];

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

  monthGroups.forEach(month => {
    orderedGroups.push([month.key, grouped[month.key]]);
  });

  return orderedGroups;
}

interface Image {
  name?: string;
  link: string;
  data: string;
  mimetype: string;
}

export function embedImage(resource: Resource | SharedResource): string {
  let content: string = resource.content || '';
  if (resource.attrs?.images) {
    const images: Image[] = resource.attrs?.images || [];
    for (const image of images) {
      if (!image.data || !image.link || !image.mimetype) {
        continue;
      }
      content = content.replaceAll(
        image.link,
        `data:${image.mimetype};base64,${image.data}`
      );
    }
  }
  return content;
}

/**
 * 解析 markdown 中的图片链接
 * @param markdownContent markdown 内容
 * @returns 图片链接数组，例如: ['attachments/xxx.jpg', 'attachments/xxx.jpg']
 */
export function parseImageLinks(markdownContent: string): string[] {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const imageLinks: string[] = [];
  let match;

  while ((match = imageRegex.exec(markdownContent)) !== null) {
    const imageUrl = match[2];
    imageLinks.push(imageUrl);
  }

  return imageLinks;
}
