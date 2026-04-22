import type { i18n as I18nType } from 'i18next';

import { Resource, SharedResource } from '@/interface';
import { getLangOnly } from '@/lib/lang';
import { getRelatedTime } from '@/lib/time.ts';

export function getTime(resource: Resource | null, i18next: I18nType) {
  if (!resource) {
    return '';
  }
  let date: Date;
  let key: string;
  if (resource.updated_at !== resource.created_at) {
    date = new Date(resource.updated_at ?? '');
    key = 'updated';
  } else {
    date = new Date(resource.created_at ?? '');
    key = 'created';
  }
  return i18next.t(`resource_header.${key}`, {
    related_time: getRelatedTime(date, i18next, true),
  });
}

interface GroupedItems<T> {
  [key: string]: Array<T>;
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

export function groupItemsByTimestamp<T extends { updated_at?: string }>(
  items: Array<T>,
  i18next: I18nType
): [string, Array<T>][] {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const grouped: GroupedItems<T> = {};
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

  const orderedGroups: [string, Array<T>][] = [];

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
 *  Analyze image links in markdown
 *  @ parammarkdownContent markdownContent
 *  @ returns image link array, for example: ['attachments/xxx. jpg ','attachments/xxx. jpg']
 */
export function parseImageLinks(markdownContent: string): string[] {
  const imageLinks: string[] = [];

  // Match Markdown format: ![alt](url)
  const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;

  while ((match = markdownImageRegex.exec(markdownContent)) !== null) {
    const imageUrl = match[2];
    imageLinks.push(imageUrl);
  }

  // Match HTML img tag format: <img src="url" ... /> or <img src='url' ... /> or <img src=url ... />
  // Match quoted src attributes: <img src="url" ... /> or <img src='url' ... />
  const htmlImageRegexQuoted = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
  const matchedUrls = new Set<string>();

  while ((match = htmlImageRegexQuoted.exec(markdownContent)) !== null) {
    const imageUrl = match[1];
    matchedUrls.add(imageUrl);
    imageLinks.push(imageUrl);
  }

  // Match unquoted src attributes: <img src=url ... />
  const htmlImageRegexUnquoted = /<img[^>]+src\s*=\s*([^\s>]+)[^>]*>/gi;
  while ((match = htmlImageRegexUnquoted.exec(markdownContent)) !== null) {
    const imageUrl = match[1];
    // Only add if not already matched by quoted regex
    if (!matchedUrls.has(imageUrl)) {
      matchedUrls.add(imageUrl);
      imageLinks.push(imageUrl);
    }
  }

  return imageLinks;
}
