import { formatDistanceToNow } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import type { i18n as I18nType } from 'i18next';

import { getLangOnly } from '@/lib/lang.ts';

export function getRelatedTime(
  date: Date,
  i18next: I18nType,
  addSuffix: boolean = true
) {
  return formatDistanceToNow(date, {
    addSuffix,
    locale: getLangOnly(i18next) === 'zh' ? zhCN : enUS,
  });
}
