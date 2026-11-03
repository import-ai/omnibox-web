import type { Application } from '@/interface';

import { WECHAT_OA_APP_ID } from './beginQrCodeBind';

// Assistants offered in Settings -> Assistants, listed in display order. The
// WeChat AI assistant comes first because binding it is the main entry point,
// and the remaining entries follow the same order as the mobile app's
// APPLICATION_IDS. Web additionally offers the QQ assistant, so it sits next to
// the other chat assistants. Assistants missing from this list keep the server
// order after the known ones, so a newly enabled assistant stays visible without
// displacing the prioritized entries.
export const APPLICATION_ORDER = [
  WECHAT_OA_APP_ID,
  'wechat_bot',
  'qq_bot',
  'wechat_clawbot',
  'telegram_bot',
] as const;

export type ApplicationId = (typeof APPLICATION_ORDER)[number];

/** Narrows a server-provided app id to one this page can render and bind. */
export function isSupportedApplicationId(
  appId: string
): appId is ApplicationId {
  return (APPLICATION_ORDER as readonly string[]).includes(appId);
}

function priorityOf(appId: string): number {
  const index = (APPLICATION_ORDER as readonly string[]).indexOf(appId);
  return index === -1 ? APPLICATION_ORDER.length : index;
}

/** Returns the list in display order without mutating the input. */
export function sortApplicationsForDisplay(
  applications: Application[]
): Application[] {
  return applications
    .map((application, index) => ({
      application,
      index,
      priority: priorityOf(application.app_id),
    }))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)
    .map(({ application }) => application);
}
